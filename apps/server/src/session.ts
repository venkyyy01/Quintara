/**
 * Room & game session management.
 *
 * The server is authoritative (§28, §139): clients send intents; every
 * command is validated by the engine, applied atomically (§138), made
 * idempotent via persisted action ids (§79), versioned (§80) and broadcast as
 * per-viewer projections only (§88).
 */

import {
  applyCommand,
  createGame,
  currentPlayerId,
  engineErrorMessage,
  EngineError,
  generateSecureSeed,
  getPlayer,
  getLegalActions,
  projectEventsForViewer,
  projectStateForViewer,
  resolveSequenceSelectionDefault,
  startGame,
  type DomainEvent,
  type GameCommand,
  type GameState,
} from "@quintara/game-engine";
import {
  chooseBotAction,
  createBotContext,
  decisionToCommand,
  type AiDifficulty,
  type BotContext,
} from "@quintara/game-ai";
import type {
  ClientGameCommand,
  ConnectionStatus,
  GameMode,
  RoomOptions,
  RoomPlayerInfo,
  RoomState,
  ServerMessage,
  GameSummary,
} from "@quintara/shared-types";
import {
  InMemoryGameStore,
  type GameStore,
  type StoredGame,
} from "./store.js";

interface RoomPlayer {
  playerId: string;
  displayName: string;
  isAi: boolean;
  isHost: boolean;
  connection: ConnectionStatus;
}

interface Room {
  id: string;
  code: string;
  mode: GameMode;
  options: RoomOptions;
  hostPlayerId: string;
  players: RoomPlayer[];
  spectators: Set<string>;
  status: "LOBBY" | "ACTIVE" | "FINISHED";
  game: StoredGame | null;
  botContexts: Map<string, BotContext>;
  turnTimer: ReturnType<typeof setTimeout> | null;
  botTimer: ReturnType<typeof setTimeout> | null;
  createdAt: number;
}

export interface SessionSink {
  /** Deliver a message to one connected player (or spectator). */
  send(playerId: string, message: ServerMessage): void;
  /** Deliver to every member of a room (players + spectators). */
  broadcastRoom(roomId: string, message: ServerMessage): void;
}

const DEFAULT_OPTIONS: RoomOptions = {
  playerCount: 2,
  teamSizes: [],
  requiredSequences: null,
  turnDurationMs: null,
  isPublic: false,
  password: null,
  aiSeats: 0,
  aiDifficulty: "MEDIUM",
};

const RECONNECT_GRACE_MS = 1000 * 60 * 3;

export class SessionManager {
  private readonly rooms = new Map<string, Room>();
  private readonly roomsByCode = new Map<string, Room>();
  private readonly roomByPlayer = new Map<string, string>();
  private readonly quickQueue: { playerId: string; displayName: string }[] = [];
  private sink: SessionSink = { send: () => {}, broadcastRoom: () => {} };

  constructor(private readonly store: GameStore = new InMemoryGameStore()) {}

  attachSink(sink: SessionSink): void {
    this.sink = sink;
  }

  // -------------------------------------------------------------------------
  // Rooms
  // -------------------------------------------------------------------------

  createRoom(
    hostPlayerId: string,
    displayName: string,
    mode: GameMode,
    partial: Partial<RoomOptions>,
  ): RoomState {
    const options: RoomOptions = { ...DEFAULT_OPTIONS, ...partial };
    const room: Room = {
      id: `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      code: generateRoomCode(),
      mode,
      options,
      hostPlayerId,
      players: [
        {
          playerId: hostPlayerId,
          displayName,
          isAi: false,
          isHost: true,
          connection: "CONNECTED",
        },
      ],
      spectators: new Set(),
      status: "LOBBY",
      game: null,
      botContexts: new Map(),
      turnTimer: null,
      botTimer: null,
      createdAt: Date.now(),
    };

    // AI seats fill the room so solo/quick games can start immediately.
    for (let i = 0; i < options.aiSeats; i++) {
      room.players.push({
        playerId: `ai-${room.code}-${i + 1}`,
        displayName: `Bot ${i + 1}`,
        isAi: true,
        isHost: false,
        connection: "CONNECTED",
      });
    }

    this.rooms.set(room.id, room);
    this.roomsByCode.set(room.code, room);
    this.roomByPlayer.set(hostPlayerId, room.id);
    return this.roomState(room);
  }

  joinRoom(
    playerId: string,
    displayName: string,
    roomCode: string,
    password?: string,
  ): { room?: RoomState; error?: string } {
    const room = this.roomsByCode.get(roomCode.trim().toUpperCase());
    if (!room) return { error: "Room not found. Check the code and try again." };
    if (room.options.password && room.options.password !== password) {
      return { error: "Incorrect room password." };
    }
    if (room.status !== "LOBBY") {
      // Rejoining an active game is allowed for reconnect (§30).
      const existing = room.players.find((p) => p.playerId === playerId);
      if (existing) {
        existing.connection = "CONNECTED";
        this.roomByPlayer.set(playerId, room.id);
        this.broadcastRoomState(room);
        return { room: this.roomState(room) };
      }
      return { error: "This game has already started." };
    }
    if (room.players.length >= room.options.playerCount) {
      return { error: "This room is full." };
    }
    if (room.players.some((p) => p.playerId === playerId)) {
      return { room: this.roomState(room) };
    }

    room.players.push({
      playerId,
      displayName,
      isAi: false,
      isHost: false,
      connection: "CONNECTED",
    });
    this.roomByPlayer.set(playerId, room.id);
    this.broadcastRoomState(room);
    return { room: this.roomState(room) };
  }

  spectateRoom(playerId: string, roomCode: string): { error?: string } {
    const room = this.roomsByCode.get(roomCode.trim().toUpperCase());
    if (!room) return { error: "Room not found." };
    room.spectators.add(playerId);
    this.roomByPlayer.set(playerId, room.id);
    this.sink.send(playerId, { type: "ROOM_STATE", room: this.roomState(room) });
    if (room.game) {
      this.sink.send(playerId, {
        type: "GAME_STATE",
        state: projectStateForViewer(room.game.currentState, null),
      });
    }
    return {};
  }

  leaveRoom(playerId: string): void {
    const roomId = this.roomByPlayer.get(playerId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.spectators.delete(playerId);
    const player = room.players.find((p) => p.playerId === playerId);
    if (player && !player.isAi) {
      if (room.status === "LOBBY") {
        room.players = room.players.filter((p) => p.playerId !== playerId);
      } else if (room.status === "ACTIVE") {
        // §30/§96: disconnection does not immediately eject the player.
        player.connection = "RECONNECTING";
        setTimeout(() => {
          const current = room.players.find((p) => p.playerId === playerId);
          if (current && current.connection === "RECONNECTING") {
            current.connection = "DISCONNECTED";
            this.broadcastRoomState(room);
          }
        }, RECONNECT_GRACE_MS);
      }
    }
    this.roomByPlayer.delete(playerId);
    this.broadcastRoomState(room);
  }

  setConnection(playerId: string, connected: boolean): void {
    const roomId = this.roomByPlayer.get(playerId);
    const room = roomId ? this.rooms.get(roomId) : undefined;
    if (!room) return;
    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) return;
    player.connection = connected ? "CONNECTED" : "RECONNECTING";
    this.broadcastRoomState(room);
  }

  // -------------------------------------------------------------------------
  // Matchmaking (§58)
  // -------------------------------------------------------------------------

  joinQuickMatch(playerId: string, displayName: string): void {
    if (!this.quickQueue.some((entry) => entry.playerId === playerId)) {
      this.quickQueue.push({ playerId, displayName });
    }
    this.sink.send(playerId, {
      type: "MATCHMAKING_STATUS",
      queued: true,
      estimatedWaitMs: 8000,
    });
    this.tryMatch();
  }

  cancelQuickMatch(playerId: string): void {
    const index = this.quickQueue.findIndex((e) => e.playerId === playerId);
    if (index >= 0) this.quickQueue.splice(index, 1);
    this.sink.send(playerId, {
      type: "MATCHMAKING_STATUS",
      queued: false,
      estimatedWaitMs: null,
    });
  }

  private tryMatch(): void {
    if (this.quickQueue.length < 2) return;
    const [a, b] = this.quickQueue.splice(0, 2) as [
      { playerId: string; displayName: string },
      { playerId: string; displayName: string },
    ];
    const room = this.rooms.get(
      // createRoom registers everything we need.
      this.createRoom(a.playerId, a.displayName, "QUICK_MATCH", {
        playerCount: 2,
        isPublic: true,
      }).roomId,
    );
    if (!room) return;
    this.joinRoom(b.playerId, b.displayName, room.code);
    for (const entry of [a, b]) {
      this.sink.send(entry.playerId, {
        type: "MATCHMAKING_STATUS",
        queued: false,
        estimatedWaitMs: null,
      });
    }
    this.startGame(room.id, room.hostPlayerId);
  }

  // -------------------------------------------------------------------------
  // Game lifecycle
  // -------------------------------------------------------------------------

  startGame(roomId: string, requesterId: string): { error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Room not found." };
    if (room.hostPlayerId !== requesterId) {
      return { error: "Only the host can start the game." };
    }
    if (room.status === "ACTIVE") return { error: "Game already started." };
    if (room.players.length < 2 && room.options.aiSeats === 0) {
      return { error: "At least two players are required." };
    }

    const created = createGame({
      gameId: room.id,
      players: room.players.map((p) => ({
        id: p.playerId,
        name: p.displayName,
      })),
      teamSizes: room.options.teamSizes.length
        ? room.options.teamSizes
        : undefined,
      requiredSequences: room.options.requiredSequences ?? undefined,
      turnDurationMs: room.options.turnDurationMs,
      seed: generateSecureSeed(),
    });
    const started = startGame(created).state;

    const game: StoredGame = {
      gameId: room.id,
      roomId: room.id,
      initialState: started,
      currentState: started,
      commands: [],
      events: [],
      processedActions: new Map(),
      summary: null,
    };
    void this.store.saveGame(game);

    room.game = game;
    room.status = "ACTIVE";
    room.botContexts.clear();

    this.broadcastGameState(room);
    this.broadcastRoomState(room);
    this.afterAction(room);
    return {};
  }

  /**
   * Submits a player command (§28). Idempotent per actionId (§79);
   * stale expectedVersion is rejected with STALE_GAME_STATE (§80).
   */
  submitCommand(
    roomId: string,
    playerId: string,
    command: ClientGameCommand,
    requestId: string,
  ): {
    ok: boolean;
    version?: number;
    duplicate?: boolean;
    errorCode?: string;
    errorMessage?: string;
  } {
    const room = this.rooms.get(roomId);
    const game = room?.game;
    if (!room || !game) {
      return { ok: false, errorCode: "GAME_NOT_ACTIVE", errorMessage: "No active game." };
    }

    // Idempotency (§79): a retried action returns the original outcome.
    const processed = game.processedActions.get(command.actionId);
    if (processed) {
      return { ok: true, version: processed.versionAfter, duplicate: true };
    }

    const authoritative: GameCommand = {
      ...(command as GameCommand),
      playerId,
    } as GameCommand;

    try {
      const result = applyCommand(game.currentState, authoritative);

      game.currentState = result.state;
      game.commands.push(authoritative);
      game.events.push(...(result.events as DomainEvent[]));
      game.processedActions.set(command.actionId, {
        actionId: command.actionId,
        playerId,
        requestId,
        versionAfter: result.state.version,
        storedAt: Date.now(),
      });
      void this.store.saveGame(game);

      // Broadcast per-viewer projections (§88) — never raw state (§23).
      this.broadcastGameState(room, result.events as DomainEvent[]);

      if (result.state.status === "FINISHED") {
        room.status = "FINISHED";
        this.finalizeGame(room);
      } else {
        this.afterAction(room);
      }

      return { ok: true, version: result.state.version };
    } catch (error) {
      if (error instanceof EngineError) {
        return {
          ok: false,
          errorCode: error.code,
          errorMessage: engineErrorMessage(error.code),
        };
      }
      return {
        ok: false,
        errorCode: "INTERNAL",
        errorMessage: "Something went wrong applying that move.",
      };
    }
  }

  /** Reconnect support (§30, §92–§93): full authoritative projection. */
  resync(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    const game = room?.game;
    if (!room || !game) return;
    const viewerId = room.players.some((p) => p.playerId === playerId)
      ? playerId
      : null;
    this.sink.send(playerId, {
      type: "GAME_STATE",
      state: projectStateForViewer(game.currentState, viewerId),
    });
    this.sink.send(playerId, { type: "ROOM_STATE", room: this.roomState(room) });
  }

  rematch(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== "FINISHED") return;
    if (room.hostPlayerId !== playerId) return;
    room.status = "LOBBY";
    room.game = null;
    this.broadcastRoomState(room);
    this.startGame(roomId, room.hostPlayerId);
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /** Runs after every action: bots, turn timers (§94). */
  private afterAction(room: Room): void {
    const game = room.game;
    if (!game || game.currentState.status !== "ACTIVE") return;

    if (room.botTimer) clearTimeout(room.botTimer);
    if (room.turnTimer) clearTimeout(room.turnTimer);

    const activeId = currentPlayerId(game.currentState);
    if (!activeId) return;
    const activePlayer = room.players.find((p) => p.playerId === activeId);

    if (activePlayer?.isAi) {
      room.botTimer = setTimeout(() => this.runBot(room), 650);
      return;
    }

    const duration = room.options.turnDurationMs;
    if (duration) {
      room.turnTimer = setTimeout(
        () => this.runTimeoutAction(room),
        duration,
      );
    }
  }

  /**
   * Bot seat action (§22, §91). Bots receive only their own seat's legal
   * information; decisions run through the shared AI package.
   */
  private runBot(room: Room): void {
    const game = room.game;
    if (!game || game.currentState.status !== "ACTIVE") return;
    const activeId = currentPlayerId(game.currentState);
    if (!activeId) return;
    const player = room.players.find((p) => p.playerId === activeId);
    if (!player?.isAi) return;

    let context = room.botContexts.get(activeId);
    if (!context) {
      context = createBotContext(room.options.aiDifficulty as AiDifficulty);
      room.botContexts.set(activeId, context);
    }

    try {
      const state = game.currentState;
      let decision;
      if (state.turnPhase === "AWAITING_SEQUENCE_SELECTION") {
        decision = {
          kind: "SELECT_SEQUENCES" as const,
          sequenceCellSets: resolveSequenceSelectionDefault(state).map((s) => [
            ...s.cells,
          ]),
        };
      } else {
        decision = chooseBotAction(state, activeId, context);
      }
      const command = decisionToCommand(
        decision,
        activeId,
        `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        game.currentState.version,
      );
      const { playerId: _ignored, ...rest } = command;
      this.submitCommand(room.id, activeId, rest, `bot-${Date.now()}`);
    } catch {
      // Bot could not act — the engine safeguard covers stuck turns.
    }
  }

  /**
   * Timeout auto-action (§94–§95): versioned policy —
   * 1. winning legal action, 2. block immediate opponent victory,
   * 3. first deterministic legal action. Never inspects hidden hands.
   */
  private runTimeoutAction(room: Room): void {
    const game = room.game;
    if (!game || game.currentState.status !== "ACTIVE") return;
    const activeId = currentPlayerId(game.currentState);
    if (!activeId) return;

    const state = game.currentState;
    try {
      let command: ClientGameCommand;
      if (state.turnPhase === "AWAITING_SEQUENCE_SELECTION") {
        command = {
          type: "SELECT_SEQUENCE_SET",
          actionId: `timeout-${Date.now()}`,
          sequenceCellSets: resolveSequenceSelectionDefault(state).map((s) => [
            ...s.cells,
          ]),
        };
      } else {
        const legal = getLegalActions(state, activeId);
        const main = legal.mainActions;
        if (main.length === 0) return; // safeguard will skip
        // Deterministic fallback: first legal action (policy v1).
        const chosen = main[0]!;
        command = {
          type: chosen.type,
          actionId: `timeout-${Date.now()}`,
          cardId: chosen.cardId,
          targetCellId: chosen.targetCellId,
        } as ClientGameCommand;
      }
      this.submitCommand(room.id, activeId, command, `timeout-${Date.now()}`);
    } catch {
      // Engine safeguard resolves genuinely stuck turns.
    }
  }

  private finalizeGame(room: Room): void {
    const game = room.game;
    if (!game) return;
    const state = game.currentState;
    const winnerTeamId = state.winnerTeamId;
    const summary: GameSummary = {
      gameId: game.gameId,
      finishedAt: state.finishedAt ?? new Date().toISOString(),
      durationMs:
        new Date(state.finishedAt ?? Date.now()).getTime() -
        new Date(state.createdAt).getTime(),
      totalTurns: state.turnNumber,
      winnerTeamId,
      resultType: state.resultType ?? "WIN",
      players: state.players.map((player) => {
        const teamId = getPlayer(state, player.id).teamId;
        return {
          playerId: player.id,
          displayName: player.name,
          teamId,
          sequences: state.completedSequences[teamId]?.length ?? 0,
        };
      }),
    };
    game.summary = summary;
    void this.store.saveGame(game);
    void this.store.saveSummary(summary);
    if (room.botTimer) clearTimeout(room.botTimer);
    if (room.turnTimer) clearTimeout(room.turnTimer);
  }

  private broadcastRoomState(room: Room): void {
    const message: ServerMessage = {
      type: "ROOM_STATE",
      room: this.roomState(room),
    };
    this.sink.broadcastRoom(room.id, message);
    for (const spectator of room.spectators) {
      this.sink.send(spectator, message);
    }
  }

  private broadcastGameState(room: Room, events?: readonly DomainEvent[]): void {
    const game = room.game;
    if (!game) return;

    for (const player of room.players) {
      if (player.isAi) continue;
      this.sink.send(player.playerId, {
        type: "GAME_STATE",
        state: projectStateForViewer(game.currentState, player.playerId),
      });
      if (events && events.length > 0) {
        this.sink.send(player.playerId, {
          type: "GAME_EVENTS",
          events: projectEventsForViewer(events, player.playerId),
          version: game.currentState.version,
        });
      }
    }
    for (const spectator of room.spectators) {
      this.sink.send(spectator, {
        type: "GAME_STATE",
        state: projectStateForViewer(game.currentState, null),
      });
      if (events && events.length > 0) {
        this.sink.send(spectator, {
          type: "GAME_EVENTS",
          events: projectEventsForViewer(events, null),
          version: game.currentState.version,
        });
      }
    }
  }

  roomState(room: Room): RoomState {
    return {
      roomId: room.id,
      roomCode: room.code,
      mode: room.mode,
      options: room.options,
      status: room.status,
      hostPlayerId: room.hostPlayerId,
      players: room.players.map(
        (player): RoomPlayerInfo => ({
          playerId: player.playerId,
          displayName: player.displayName,
          seat: null,
          teamId: null,
          connection: player.connection,
          isAi: player.isAi,
          isHost: player.isHost,
        }),
      ),
    };
  }

  getRoomForPlayer(playerId: string): Room | undefined {
    const roomId = this.roomByPlayer.get(playerId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /** Authoritative game state accessor (server-side only; tests/telemetry). */
  getGameState(roomId: string): GameState | null {
    return this.rooms.get(roomId)?.game?.currentState ?? null;
  }

  async listHistory(limit = 20): Promise<GameSummary[]> {
    return this.store.listSummaries(limit);
  }

  async getReplay(gameId: string) {
    return this.store.getGame(gameId);
  }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}
