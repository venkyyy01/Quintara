/**
 * Mandated multiplayer tests (§81, §129–§132):
 *  - wrong player's turn rejected
 *  - duplicate action does not repeat (idempotency)
 *  - stale game version handled (concurrency)
 *  - opponent/teammate hand not leaked (privacy over the wire)
 *  - reconnect restores correct state without duplicating moves
 */
import { describe, expect, it, vi } from "vitest";
import {
  cardCellsForCode,
  currentPlayerId,
  getLegalActions,
  isJackCode,
  scenario,
  type GameState,
} from "@quintara/game-engine";
import type { ServerMessage } from "@quintara/shared-types";
import { SessionManager, pickTimeoutAction } from "../src/session.js";

function setupGame() {
  const delivered: Record<string, ServerMessage[]> = {
    alice: [],
    bob: [],
  };
  const sessions = new SessionManager();
  sessions.attachSink({
    send(playerId, message) {
      (delivered[playerId] ??= []).push(message);
    },
    broadcastRoom() {},
  });

  const room = sessions.createRoom("alice", "Alice", "PRIVATE", {
    playerCount: 2,
    aiSeats: 0,
  });
  sessions.joinRoom("bob", "Bob", room.roomCode);
  sessions.startGame(room.roomId, "alice");
  return { sessions, roomId: room.roomId, delivered };
}

function firstLegalCommand(state: GameState, playerId: string) {
  const legal = getLegalActions(state, playerId);
  const action = legal.mainActions[0] ?? legal.deadExchanges[0];
  if (!action) throw new Error("no legal actions");
  if (action.type === "EXCHANGE_DEAD_CARD") {
    return {
      type: "EXCHANGE_DEAD_CARD" as const,
      actionId: "action-1",
      cardId: action.cardId,
    };
  }
  return {
    type: action.type,
    actionId: "action-1",
    cardId: action.cardId,
    targetCellId: action.targetCellId,
  };
}

describe("multiplayer command model (§28)", () => {
  it("rejects a command on another player's turn (§81)", () => {
    const { sessions, roomId } = setupGame();
    const state = sessions.getGameState(roomId)!;
    const active = currentPlayerId(state)!;
    const other = active === "alice" ? "bob" : "alice";

    const result = sessions.submitCommand(
      roomId,
      other,
      {
        type: "PLAY_NORMAL_CARD",
        actionId: "bad-1",
        cardId: "whatever",
        targetCellId: "r1c1",
      },
      "req-1",
    );
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("NOT_YOUR_TURN");
  });

  it("binds identity server-side: playerId in the payload is ignored (§139)", () => {
    const { sessions, roomId } = setupGame();
    const state = sessions.getGameState(roomId)!;
    const active = currentPlayerId(state)!;
    const other = active === "alice" ? "bob" : "alice";

    // The attacker submits a valid command for the active player but
    // authenticates as the other player.
    const legal = getLegalActions(state, active);
    const action = legal.mainActions[0]!;
    const result = sessions.submitCommand(
      roomId,
      other,
      {
        type: action.type,
        actionId: "spoof-1",
        cardId: action.cardId,
        targetCellId: action.targetCellId,
      } as never,
      "req-2",
    );
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("NOT_YOUR_TURN");
  });
});

describe("idempotency (§79, §129)", () => {
  it("applying the same actionId twice changes state exactly once", () => {
    const { sessions, roomId } = setupGame();
    const before = sessions.getGameState(roomId)!;
    const active = currentPlayerId(before)!;
    const command = firstLegalCommand(before, active);

    const first = sessions.submitCommand(roomId, active, command, "req-1");
    expect(first.ok).toBe(true);
    const afterFirst = sessions.getGameState(roomId)!;
    expect(afterFirst.version).toBe(before.version + 1);

    // Retry — e.g. a network retry after a lost response (§30).
    const second = sessions.submitCommand(roomId, active, command, "req-1");
    expect(second.ok).toBe(true);
    expect(second.duplicate).toBe(true);

    const afterSecond = sessions.getGameState(roomId)!;
    expect(afterSecond.version).toBe(afterFirst.version);
    expect(JSON.stringify(afterSecond)).toBe(JSON.stringify(afterFirst));
  });
});

describe("optimistic concurrency (§80, §130)", () => {
  it("rejects commands with a stale expectedVersion without partial effects", () => {
    const { sessions, roomId } = setupGame();
    const before = sessions.getGameState(roomId)!;
    const active = currentPlayerId(before)!;
    const command = firstLegalCommand(before, active);

    const result = sessions.submitCommand(
      roomId,
      active,
      { ...command, actionId: "stale-1", expectedVersion: before.version + 9 },
      "req-3",
    );
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("STALE_GAME_STATE");

    const after = sessions.getGameState(roomId)!;
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
  });

  it("accepts the correct expectedVersion", () => {
    const { sessions, roomId } = setupGame();
    const before = sessions.getGameState(roomId)!;
    const active = currentPlayerId(before)!;
    const command = firstLegalCommand(before, active);

    const result = sessions.submitCommand(
      roomId,
      active,
      { ...command, actionId: "fresh-1", expectedVersion: before.version },
      "req-4",
    );
    expect(result.ok).toBe(true);
    expect(result.version).toBe(before.version + 1);
  });
});

describe("hand privacy over the wire (§8, §131)", () => {
  it("never includes opponent hand identities in any broadcast payload", () => {
    const { sessions, roomId, delivered } = setupGame();
    const state = sessions.getGameState(roomId)!;
    const active = currentPlayerId(state)!;
    const other = active === "alice" ? "bob" : "alice";
    const command = firstLegalCommand(state, active);

    const first = sessions.submitCommand(roomId, active, command, "req-5");
    expect(first.ok).toBe(true);
    const after = sessions.getGameState(roomId)!;

    // Cards remaining in the active player's hand must never reach the
    // opponent's connection — not the state projection, not the events.
    const activeHandIds = after.hands[active] ?? [];
    const otherMessages = JSON.stringify(delivered[other] ?? []);
    expect(activeHandIds.length).toBeGreaterThan(0);
    for (const cardId of activeHandIds) {
      expect(otherMessages).not.toContain(cardId);
    }

    // The viewer does receive their own exact hand (§131).
    const otherStateMessages = (delivered[other] ?? []).filter(
      (m) => m.type === "GAME_STATE",
    );
    const latestOther = otherStateMessages[otherStateMessages.length - 1];
    if (latestOther?.type === "GAME_STATE") {
      expect(latestOther.state.hand?.map((c) => c.id)).toEqual(
        after.hands[other],
      );
    }

    // The active player also receives their own hand.
    const activeMessages = JSON.stringify(delivered[active] ?? []);
    for (const cardId of activeHandIds) {
      expect(activeMessages).toContain(cardId);
    }

    // Every GAME_STATE payload is a projection: no draw pile order, no RNG.
    for (const message of delivered[other] ?? []) {
      if (message.type === "GAME_STATE") {
        const json = JSON.stringify(message.state);
        expect(json).not.toContain('"drawPile"');
        expect(json).not.toContain('"rng"');
        expect(json).not.toContain('"s0"');
      }
    }
  });
});

describe("reconnect (§30, §132)", () => {
  it("resync restores authoritative state and retries do not duplicate", () => {
    const { sessions, roomId, delivered } = setupGame();
    const before = sessions.getGameState(roomId)!;
    const active = currentPlayerId(before)!;
    const command = firstLegalCommand(before, active);

    // Action committed, but the response is "lost" (client never saw it).
    const first = sessions.submitCommand(roomId, active, command, "req-6");
    expect(first.ok).toBe(true);

    // Client reconnects and asks for authoritative state (§92).
    sessions.setConnection(active, false);
    sessions.setConnection(active, true);
    sessions.resync(roomId, active);

    const stateMessages = (delivered[active] ?? []).filter(
      (m) => m.type === "GAME_STATE",
    );
    const latest = stateMessages[stateMessages.length - 1];
    expect(latest?.type).toBe("GAME_STATE");
    if (latest?.type === "GAME_STATE") {
      expect(latest.state.version).toBe(first.version);
    }

    // Retrying the in-flight action after reconnect is safe (§93).
    const retry = sessions.submitCommand(roomId, active, command, "req-6");
    expect(retry.ok).toBe(true);
    expect(retry.duplicate).toBe(true);
    const after = sessions.getGameState(roomId)!;
    expect(after.version).toBe(first.version);
  });
});

describe("actionId collision safety (§79)", () => {
  it("the same actionId from a different seat is a distinct action", () => {
    const { sessions, roomId } = setupGame();
    let state = sessions.getGameState(roomId)!;
    const first = currentPlayerId(state)!;
    // firstLegalCommand hardcodes actionId "action-1".
    const commandA = firstLegalCommand(state, first);
    expect(sessions.submitCommand(roomId, first, commandA, "r1").ok).toBe(true);

    state = sessions.getGameState(roomId)!;
    const second = currentPlayerId(state)!;
    expect(second).not.toBe(first);
    const commandB = firstLegalCommand(state, second);
    expect(commandB.actionId).toBe(commandA.actionId);

    const result = sessions.submitCommand(roomId, second, commandB, "r2");
    expect(result.ok).toBe(true);
    expect(result.duplicate).toBeUndefined();
  });
});

describe("room option normalisation (§28)", () => {
  it("AI seats can never crowd the host out of their own room", () => {
    const sessions = new SessionManager();
    sessions.attachSink({
      send() {},
      broadcastRoom() {},
    });
    const room = sessions.createRoom("host", "Host", "SOLO", {
      playerCount: 2,
      aiSeats: 3,
    });
    expect(room.options.aiSeats).toBe(1);
    expect(room.players.filter((p) => p.isAi)).toHaveLength(1);
    expect(room.players.some((p) => p.playerId === "host" && p.isHost)).toBe(
      true,
    );
  });

  it("an invalid playerCount falls back to the default", () => {
    const sessions = new SessionManager();
    sessions.attachSink({
      send() {},
      broadcastRoom() {},
    });
    const room = sessions.createRoom("h", "Host", "PRIVATE", {
      playerCount: Number.NaN,
    });
    expect(room.options.playerCount).toBe(2);
  });

  it("startGame refuses until the room is exactly full", () => {
    const sessions = new SessionManager();
    sessions.attachSink({
      send() {},
      broadcastRoom() {},
    });
    const room = sessions.createRoom("host", "Host", "PRIVATE", {
      playerCount: 3,
      aiSeats: 1,
    });
    // host + 1 bot = 2 of 3 seats; starting early would misdeal hands.
    const result = sessions.startGame(room.roomId, "host");
    expect(result.error).toBeTruthy();
  });
});

describe("timeout auto-action policy (§94–§95)", () => {
  it("takes an immediately winning placement (plays the win, not main[0])", () => {
    // One required line (three competing sides) so a single placement wins.
    const state = scenario({ requiredSequences: 1 })
      .withCurrentPlayer("A")
      .withHand("A", ["2C", "JD"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .withMarker("A", 5, 4)
      .build();
    const active = currentPlayerId(state)!;
    const main = getLegalActions(state, active).mainActions;
    const chosen = pickTimeoutAction(state, active, main);
    // The 4-run finishes at either end — both are a winning placement.
    expect(["r5c5", "r5c0"]).toContain(chosen.targetCellId);
  });

  it("blocks an opponent's immediate victory before any other move", () => {
    const state = scenario({ requiredSequences: 1 })
      .withCurrentPlayer("A")
      .withHand("A", ["2C", "JD"])
      .withMarker("B", 3, 1)
      .withMarker("B", 3, 2)
      .withMarker("B", 3, 3)
      .withMarker("B", 3, 4)
      .build();
    const active = currentPlayerId(state)!;
    const main = getLegalActions(state, active).mainActions;
    const chosen = pickTimeoutAction(state, active, main);
    expect(["r3c5", "r3c0"]).toContain(chosen.targetCellId);
  });
});

describe("matchmaking cancellation (§58)", () => {
  it("leaving cancels a pending quick-match request", () => {
    const sessions = new SessionManager();
    sessions.attachSink({
      send() {},
      broadcastRoom() {},
    });
    sessions.joinQuickMatch("a", "Alice");
    sessions.leaveRoom("a");

    // With only one queued player there is no match — "b" must stay alone.
    sessions.joinQuickMatch("b", "Bob");
    expect(sessions.getRoomForPlayer("b")).toBeUndefined();
  });
});

describe("room cleanup (§30)", () => {
  it("disposes an abandoned room after the reconnect grace period", () => {
    vi.useFakeTimers();
    const sessions = new SessionManager();
    sessions.attachSink({
      send() {},
      broadcastRoom() {},
    });
    const room = sessions.createRoom("solo", "Solo", "PRIVATE", {
      playerCount: 2,
      aiSeats: 0,
    });
    expect(sessions.getRoom(room.roomId)).toBeDefined();

    sessions.setConnection("solo", false);
    vi.advanceTimersByTime(3 * 60 * 1000 + 10);
    expect(sessions.getRoom(room.roomId)).toBeUndefined();

    vi.useRealTimers();
  });

  it("a reconnect within the grace period keeps the room alive", () => {
    vi.useFakeTimers();
    const sessions = new SessionManager();
    sessions.attachSink({
      send() {},
      broadcastRoom() {},
    });
    const room = sessions.createRoom("solo", "Solo", "PRIVATE", {
      playerCount: 2,
      aiSeats: 0,
    });
    sessions.setConnection("solo", false);
    vi.advanceTimersByTime(60 * 1000);
    sessions.setConnection("solo", true);
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(sessions.getRoom(room.roomId)).toBeDefined();

    vi.useRealTimers();
  });
});

describe("room membership integrity (§28, §30)", () => {
  function quietSessions() {
    const sessions = new SessionManager();
    sessions.attachSink({
      send() {},
      broadcastRoom() {},
    });
    return sessions;
  }

  it("a leaver's seat is released when the game has finished (rematch stays viable)", () => {
    const { sessions, roomId } = setupGame();
    const room = sessions.getRoom(roomId)!;
    room.status = "FINISHED";
    sessions.leaveRoom("bob");
    // A FINISHED room keeps its roster for the rematch — a leaver must not
    // ghost a seat and get auto-dealt into the next game.
    expect(room.players.some((p) => p.playerId === "bob")).toBe(false);
    const result = sessions.rematch(roomId, "alice");
    // Shorthanded: the rematch must report the missing seat, not start.
    expect(result.error).toBeTruthy();
    expect(sessions.getRoom(roomId)!.status).toBe("LOBBY");
  });

  it("the host title migrates when the host leaves a lobby", () => {
    const sessions = quietSessions();
    const room = sessions.createRoom("alice", "Alice", "PRIVATE", {
      playerCount: 2,
      aiSeats: 0,
    });
    sessions.joinRoom("bob", "Bob", room.roomCode);
    sessions.leaveRoom("alice");
    const current = sessions.getRoom(room.roomId)!;
    expect(current.hostPlayerId).toBe("bob");
    expect(
      current.players.some((p) => p.playerId === "bob" && p.isHost),
    ).toBe(true);
  });

  it("a player belongs to exactly one room", () => {
    const sessions = quietSessions();
    const first = sessions.createRoom("alice", "Alice", "PRIVATE", {
      playerCount: 2,
      aiSeats: 0,
    });
    const second = sessions.createRoom("alice", "Alice", "PRIVATE", {
      playerCount: 2,
      aiSeats: 0,
    });
    expect(sessions.getRoomForPlayer("alice")!.id).toBe(second.roomId);
    // The abandoned room is either disposed outright (empty lobby) or no
    // longer lists alice — never a ghost seat.
    const leftover = sessions.getRoom(first.roomId);
    expect(
      leftover === undefined ||
        !leftover.players.some((p) => p.playerId === "alice"),
    ).toBe(true);
  });

  it("spectating a password-protected room requires the password", () => {
    const sessions = quietSessions();
    const room = sessions.createRoom("host", "Host", "PRIVATE", {
      playerCount: 2,
      aiSeats: 0,
      password: "secret",
    });
    expect(sessions.spectateRoom("spy", room.roomCode).error).toBeTruthy();
    expect(
      sessions.spectateRoom("spy", room.roomCode, "secret").error,
    ).toBeUndefined();
    expect(sessions.getRoom(room.roomId)!.spectators.has("spy")).toBe(true);
  });

  it("startGame on a finished room reports an error instead of redealing", () => {
    const { sessions, roomId } = setupGame();
    sessions.getRoom(roomId)!.status = "FINISHED";
    const result = sessions.startGame(roomId, "alice");
    expect(result.error).toBeTruthy();
  });

  it("an engine-invalid room configuration surfaces as a room error", () => {
    const sessions = quietSessions();
    // 5 seats with no custom configuration is rejected by the engine.
    const room = sessions.createRoom("host", "Host", "PRIVATE", {
      playerCount: 5,
      aiSeats: 4,
    });
    const result = sessions.startGame(room.roomId, "host");
    expect(result.error).toBeTruthy();
  });
});

describe("timeout resolves exchange-only turns (§75, §94)", () => {
  it("takes the dead-card exchange instead of stalling the turn forever", () => {
    vi.useFakeTimers();
    const sessions = new SessionManager();
    sessions.attachSink({
      send() {},
      broadcastRoom() {},
    });
    const roomState = sessions.createRoom("a", "A", "PRIVATE", {
      playerCount: 2,
      aiSeats: 0,
      turnDurationMs: 1000,
    });
    sessions.joinRoom("b", "B", roomState.roomCode);
    sessions.startGame(roomState.roomId, "a");
    const game = sessions.getRoom(roomState.roomId)!.game!;

    // Rig: both seats hold exactly one dead card, draw pile empty. The only
    // legal action for the active player is the dead-card exchange.
    const base = game.currentState;
    const normalCardId = (pid: string) =>
      (base.hands[pid] ?? []).find(
        (id) => !isJackCode(base.cards[id]!.code),
      )!;
    const cells = { ...base.board.cells };
    for (const pid of ["a", "b"] as const) {
      const teamId = base.players.find((p) => p.id === pid)!.teamId;
      for (const id of cardCellsForCode(
        base.boardDefinition,
        base.cards[normalCardId(pid)]!.code,
      )) {
        cells[id] = { occupantTeamId: teamId, occupantPlayerId: pid };
      }
    }
    game.currentState = {
      ...base,
      hands: { a: [normalCardId("a")], b: [normalCardId("b")] },
      drawPile: [],
      discardPiles: { a: [], b: [] },
      board: { ...base.board, cells },
    };

    // First timeout exchanges and skips the active seat; the second resolves
    // the other seat the same way and the stalemate safeguard ends the game.
    vi.advanceTimersByTime(1000);
    expect(game.processedActions.size).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(game.currentState.status).toBe("FINISHED");
    expect(game.currentState.resultType).toBe("STALEMATE");

    vi.useRealTimers();
  });
});
