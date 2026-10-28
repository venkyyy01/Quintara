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
  detectCandidateSequences,
  engineErrorMessage,
  EngineError,
  findMaximumCompatibleSets,
  generateSecureSeed,
  getPlayer,
  getLegalActions,
  projectEventsForViewer,
  projectStateForViewer,
  resolveSequenceSelectionDefault,
  startGame,
  type CellId,
  type DomainEvent,
  type GameCommand,
  type GameState,
  type MainAction,
  type TeamId,
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
  private readonly disconnectTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
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
    // Normalise client-supplied options: a missing/invalid playerCount would
    // otherwise make createGame throw mid-startGame with a confusing error.
    const requestedCount = Number(partial.playerCount);
    const playerCount =
      Number.isInteger(requestedCount) && requestedCount >= 2
        ? requestedCount
        : DEFAULT_OPTIONS.playerCount;

    // AI seats can never crowd out the host: at least one seat stays human.
    const requestedAiSeats = Number(partial.aiSeats ?? DEFAULT_OPTIONS.aiSeats);
    const aiSeats =
      Number.isInteger(requestedAiSeats) && requestedAiSeats > 0
        ? Math.min(playerCount - 1, requestedAiSeats)
        : 0;

    // A team configuration that does not match the seat count would make
    // createGame reject the game later; fall back to the default layout.
    const requestedTeamSizes = partial.teamSizes ?? DEFAULT_OPTIONS.teamSizes;
    const teamSizes =
      requestedTeamSizes.length > 0 &&
      requestedTeamSizes.reduce((a, b) => a + b, 0) === playerCount
        ? [...requestedTeamSizes]
        : [];

    const options: RoomOptions = {
      ...DEFAULT_OPTIONS,
      ...partial,
      playerCount,
      aiSeats,
      teamSizes,
    };

    const room: Room = {
      id: `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      code: this.unusedRoomCode(),
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

    for (let i = 0; i < options.aiSeats; i++) {
      room.players.push({
        playerId: `ai-${room.code}-${i + 1}`,
        displayName: `Bot ${i + 1}`,
        isAi: true,
        isHost: false,
        connection: "CONNECTED",
      });
    }

    // A player belongs to at most one room: creating a room abandons any
    // previous membership, or the old room keeps a ghost seat forever.
    this.leaveRoom(hostPlayerId);
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
        if (this.roomByPlayer.get(playerId) !== room.id) {
          this.leaveRoom(playerId);
        }
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

    // Single-room membership: joining abandons any previous room.
    if (this.roomByPlayer.get(playerId) !== room.id) {
      this.leaveRoom(playerId);
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

  spectateRoom(
    playerId: string,
    roomCode: string,
    password?: string,
  ): { error?: string } {
    const room = this.roomsByCode.get(roomCode.trim().toUpperCase());
    if (!room) return { error: "Room not found." };
    if (room.options.password && room.options.password !== password) {
      return { error: "Incorrect room password." };
    }
    if (this.roomByPlayer.get(playerId) !== room.id) {
      this.leaveRoom(playerId);
    }
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
    // Leaving also cancels a pending quick-match request (§58).
    this.cancelQuickMatch(playerId);
    const roomId = this.roomByPlayer.get(playerId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.spectators.delete(playerId);
    const pendingDisconnect = this.disconnectTimers.get(playerId);
    if (pendingDisconnect) {
      clearTimeout(pendingDisconnect);
      this.disconnectTimers.delete(playerId);
    }
    const player = room.players.find((p) => p.playerId === playerId);
    if (player && !player.isAi) {
      if (room.status === "ACTIVE") {
        // §30/§96: disconnection does not immediately eject the player.
        player.connection = "RECONNECTING";
        setTimeout(() => {
          const current = room.players.find((p) => p.playerId === playerId);
          if (current && current.connection === "RECONNECTING") {
            current.connection = "DISCONNECTED";
            this.broadcastRoomState(room);
          }
        }, RECONNECT_GRACE_MS);
      } else {
        // LOBBY and FINISHED release the seat immediately. A FINISHED room
        // keeps its roster for the rematch — a departed player must not
        // ghost a seat, or the rematch starts shorthanded or not at all.
        room.players = room.players.filter((p) => p.playerId !== playerId);
        if (room.hostPlayerId === playerId) {
          // Host migration: the room must remain startable.
          const nextHost = room.players.find((p) => !p.isAi);
          if (nextHost) {
            room.hostPlayerId = nextHost.playerId;
            nextHost.isHost = true;
          }
        }
      }
    }
    this.roomByPlayer.delete(playerId);
    this.broadcastRoomState(room);
    this.sweepIfEmpty(room);
  }

  setConnection(playerId: string, connected: boolean): void {
    const roomId = this.roomByPlayer.get(playerId);
    const room = roomId ? this.rooms.get(roomId) : undefined;
    if (!room) return;
    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) return;

    if (connected) {
      const timer = this.disconnectTimers.get(playerId);
      if (timer) {
        clearTimeout(timer);
        this.disconnectTimers.delete(playerId);
      }
      player.connection = "CONNECTED";
    } else {
      player.connection = "RECONNECTING";
      const existing = this.disconnectTimers.get(playerId);
      if (existing) clearTimeout(existing);
      this.disconnectTimers.set(
        playerId,
        setTimeout(() => {
          this.disconnectTimers.delete(playerId);
          const current = room.players.find((p) => p.playerId === playerId);
          if (current && current.connection === "RECONNECTING") {
            current.connection = "DISCONNECTED";
            this.broadcastRoomState(room);
            this.sweepIfEmpty(room);
          }
        }, RECONNECT_GRACE_MS),
      );
    }
    this.broadcastRoomState(room);
  }

  /**
   * Disposes a room once no human can ever use it again (all humans
   * disconnected and no spectators watching). Without this, abandoned rooms
   * and their timers accumulate forever.
   */
  /** Invite codes key roomsByCode, so never reuse a code that is live. */
  private unusedRoomCode(): string {
    for (let attempt = 0; attempt < 50; attempt++) {
      const code = drawRoomCode();
      if (!this.roomsByCode.has(code)) return code;
    }
    return `Q${Date.now().toString(36).toUpperCase().slice(-5)}`;
  }

  private sweepIfEmpty(room: Room): void {
    const anyConnected = room.players.some(
      (p) => !p.isAi && p.connection === "CONNECTED",
    );
    if (anyConnected || room.spectators.size > 0) return;
    this.disposeRoom(room);
  }

  private disposeRoom(room: Room): void {
    if (room.botTimer) clearTimeout(room.botTimer);
    if (room.turnTimer) clearTimeout(room.turnTimer);
    for (const player of room.players) {
      if (this.roomByPlayer.get(player.playerId) === room.id) {
        this.roomByPlayer.delete(player.playerId);
      }
    }
    for (const spectator of room.spectators) {
      if (this.roomByPlayer.get(spectator) === room.id) {
        this.roomByPlayer.delete(spectator);
      }
    }
    this.rooms.delete(room.id);
    this.roomsByCode.delete(room.code);
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
    if (room.status !== "LOBBY") return { error: "Game already started." };

    // The dealing configuration is derived from the seat count, so the room
    // must be exactly full (humans + AI seats) before the host may start.
    const teamSizesProvided = room.options.teamSizes.length > 0;
    const target = teamSizesProvided
      ? room.options.teamSizes.reduce((a, b) => a + b, 0)
      : room.options.playerCount;
    if (room.players.length < target) {
      return {
        error: `Waiting for players — ${target - room.players.length} more seat(s) needed.`,
      };
    }
    if (room.players.length > target) {
      return { error: "Too many players for this configuration." };
    }
    if (!room.players.some((p) => !p.isAi)) {
      return { error: "At least one human player is required." };
    }

    // Room options arrive from clients; a configuration the engine rejects
    // must surface as a room error, not an unhandled throw.
    let started: GameState;
    try {
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
      started = startGame(created).state;
    } catch (error) {
      return {
        error:
          error instanceof EngineError
            ? error.message || engineErrorMessage(error.code)
            : "Could not start this game configuration.",
      };
    }

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
    // Keyed by (playerId, actionId): clients routinely reuse short actionIds
    // ("a1") across seats and turns, and a bare actionId would replay one
    // player's move as another's.
    const actionKey = `${playerId}:${command.actionId}`;
    const processed = game.processedActions.get(actionKey);
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
      game.processedActions.set(actionKey, {
        actionId: actionKey,
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

  rematch(
    roomId: string,
    playerId: string,
  ): { ok?: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== "FINISHED") {
      return { error: "No finished game to rematch." };
    }
    if (room.hostPlayerId !== playerId) {
      return { error: "Only the host can start the rematch." };
    }
    room.status = "LOBBY";
    room.game = null;
    this.broadcastRoomState(room);
    const started = this.startGame(roomId, room.hostPlayerId);
    return started.error ? { error: started.error } : { ok: true };
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
      const result = this.submitCommand(
        room.id,
        activeId,
        rest,
        `bot-${Date.now()}`,
      );
      if (!result.ok) {
        // A rejected bot move must not strand the table — fall back to the
        // deterministic timeout policy for this turn.
        this.runTimeoutAction(room);
      }
    } catch {
      // Bot decision failed — the deterministic timeout policy still
      // advances the turn (the engine skip safeguard only runs while a
      // command is applied).
      this.runTimeoutAction(room);
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
        if (main.length === 0) {
          // §75/§94: no main action, but an unused dead-card exchange may
          // still be legal. Take it deterministically — abandoning the turn
          // here would leave it stuck forever, because the engine's skip
          // safeguard only runs while applying a command.
          const exchange = legal.deadExchanges[0];
          if (!exchange) return; // engine safeguard already resolved this
          command = {
            type: "EXCHANGE_DEAD_CARD",
            actionId: `timeout-${Date.now()}`,
            cardId: exchange.cardId,
          };
        } else {
          const chosen = pickTimeoutAction(state, activeId, main);
          command = {
            type: chosen.type,
            actionId: `timeout-${Date.now()}`,
            cardId: chosen.cardId,
            targetCellId: chosen.targetCellId,
          } as ClientGameCommand;
        }
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
    // sink.broadcastRoom already delivers to players *and* spectators.
    this.sink.broadcastRoom(room.id, message);
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

/**
 * §94–§95 timeout auto-action policy (v1): 1. an immediately-winning
 * placement, 2. a placement blocking an immediate opponent victory,
 * 3. the first deterministic legal action. Uses public board state only —
 * never hidden hands.
 */
export function pickTimeoutAction(
  state: GameState,
  playerId: string,
  main: readonly MainAction[],
): MainAction {
  const myTeam = getPlayer(state, playerId).teamId;
  const needs =
    state.requiredSequences -
    (state.completedSequences[myTeam]?.length ?? 0);

  const threatFor = (teamId: TeamId, cellId: string): number =>
    findMaximumCompatibleSets(
      detectCandidateSequences(state, teamId, cellId as CellId),
      state.completedSequences[teamId] ?? [],
    )[0]?.length ?? 0;

  const placements = main.filter((a) => a.type !== "PLAY_REMOVE_JACK");
  const winning = placements.find(
    (a) => needs <= 0 || threatFor(myTeam, a.targetCellId) >= needs,
  );
  if (winning) return winning as MainAction;

  for (const team of state.teams) {
    if (team.id === myTeam) continue;
    const oppNeeds =
      state.requiredSequences -
      (state.completedSequences[team.id]?.length ?? 0);
    if (oppNeeds <= 0) continue;
    const blocker = placements.find(
      (a) => threatFor(team.id, a.targetCellId) >= oppNeeds,
    );
    if (blocker) return blocker as MainAction;
  }
  return main[0] as MainAction;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function drawRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}
