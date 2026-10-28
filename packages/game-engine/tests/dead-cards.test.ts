/**
 * Required dead-card tests (§116) + §26–§30.
 */
import { describe, expect, it } from "vitest";
import {
  applyCommand,
  canExchangeDeadCard,
  cardCellsForCode,
  createGame,
  currentPlayerId,
  deadCardsInHand,
  getLegalActions,
  isDeadCard,
  isJackCode,
  scenario,
  startGame,
  validateGameState,
} from "../src/index.js";
import { codeCoords, handCardId } from "./helpers.js";

function eightCard(state: ReturnType<typeof scenario.prototype.build>) {
  const id = Object.keys(state.cards).find(
    (cardId) => state.cards[cardId]?.code === "8H",
  )!;
  return state.cards[id]!;
}

describe("dead-card detection (§26–§28, §116)", () => {
  it("both copies occupied by opponent → dead", () => {
    const pre = scenario().build();
    const coords = codeCoords(pre, "8H");
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withMarker("B", coords[0]!.row, coords[0]!.column)
      .withMarker("B", coords[1]!.row, coords[1]!.column)
      .build();
    expect(isDeadCard(state, eightCard(state))).toBe(true);
    expect(deadCardsInHand(state, "p-A").map((c) => c.code)).toEqual(["8H"]);
  });

  it("both copies occupied by the current team → dead", () => {
    const pre = scenario().build();
    const coords = codeCoords(pre, "8H");
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withMarker("A", coords[0]!.row, coords[0]!.column)
      .withMarker("A", coords[1]!.row, coords[1]!.column)
      .build();
    expect(isDeadCard(state, eightCard(state))).toBe(true);
  });

  it("copies occupied by different teams → dead", () => {
    const pre = scenario().build();
    const coords = codeCoords(pre, "8H");
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withMarker("A", coords[0]!.row, coords[0]!.column)
      .withMarker("B", coords[1]!.row, coords[1]!.column)
      .build();
    expect(isDeadCard(state, eightCard(state))).toBe(true);
  });

  it("one copy open → not dead", () => {
    const pre = scenario().build();
    const coords = codeCoords(pre, "8H");
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withMarker("B", coords[0]!.row, coords[0]!.column)
      .build();
    expect(isDeadCard(state, eightCard(state))).toBe(false);
  });

  it("both copies open → not dead", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .build();
    expect(isDeadCard(state, eightCard(state))).toBe(false);
  });

  it("Jacks are never dead (§41)", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JH", "JC"])
      .build();
    for (const code of ["JH", "JC"]) {
      const id = handCardId(state, "p-A", code);
      expect(isDeadCard(state, state.cards[id]!)).toBe(false);
    }
    expect(deadCardsInHand(state, "p-A")).toEqual([]);
  });
});

describe("dead-card exchange (§29–§30, §116)", () => {
  function deadHandState(extra: string[] = []) {
    const pre = scenario().build();
    const coords = codeCoords(pre, "8H");
    return scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H", ...extra])
      .withMarker("A", coords[0]!.row, coords[0]!.column)
      .withMarker("B", coords[1]!.row, coords[1]!.column)
      .build();
  }

  it("exchanges once: discards, draws replacement, continues same turn (§155)", () => {
    const state = deadHandState(["AC"]);
    expect(canExchangeDeadCard(state, "p-A")).toBe(true);

    const result = applyCommand(state, {
      type: "EXCHANGE_DEAD_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "8H"),
    });

    // 8H discarded, replacement drawn, turn still active for A.
    expect(result.state.discardPiles["p-A"]).toContain(
      handCardId(state, "p-A", "8H"),
    );
    expect(result.state.hands["p-A"]?.length).toBe(2);
    expect(result.state.turnOrder[result.state.currentTurnIndex]).toBe("p-A");
    expect(result.state.turnPhase).toBe("AWAITING_MAIN_ACTION");
    expect(result.state.deadCardExchangeUsed).toBe(true);

    // Event order (§155): DEAD_CARD_EXCHANGED, CARD_DRAWN with replacement reason.
    const types = result.events.map((e) => e.type);
    expect(types[0]).toBe("DEAD_CARD_EXCHANGED");
    expect(types[1]).toBe("CARD_DRAWN");
    const drawn = result.events[1] as { reason: string };
    expect(drawn.reason).toBe("DEAD_CARD_REPLACEMENT");
    expect(validateGameState(result.state)).toEqual([]);
  });

  it("rejects a second exchange in the same turn (DEAD_CARD_ALREADY_EXCHANGED)", () => {
    const state = deadHandState(["AC"]);
    const first = applyCommand(state, {
      type: "EXCHANGE_DEAD_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "8H"),
    });
    // The replacement may itself be dead, but only one exchange per turn (§30).
    const nextDead = deadCardsInHand(first.state, "p-A");
    expect(nextDead.length).toBeGreaterThanOrEqual(0);
    expect(() =>
      applyCommand(first.state, {
        type: "EXCHANGE_DEAD_CARD",
        playerId: "p-A",
        actionId: "a2",
        cardId: (first.state.hands["p-A"] ?? [])[0]!,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "DEAD_CARD_ALREADY_EXCHANGED",
      }) as Error,
    );
  });

  it("the replacement may itself be dead (§30) — and no second exchange is allowed", () => {
    // Draw pile topped with QS whose both cells are occupied.
    const pre = scenario().build();
    const eightCoords = codeCoords(pre, "8H");
    const qsCoords = codeCoords(pre, "QS");
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H", "AC"])
      .withDrawPile(["QS"])
      .withMarker("A", eightCoords[0]!.row, eightCoords[0]!.column)
      .withMarker("B", eightCoords[1]!.row, eightCoords[1]!.column)
      .withMarker("A", qsCoords[0]!.row, qsCoords[0]!.column)
      .withMarker("B", qsCoords[1]!.row, qsCoords[1]!.column)
      .build();

    const result = applyCommand(state, {
      type: "EXCHANGE_DEAD_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "8H"),
    });
    const drawnCard = result.state.cards[
      (result.state.hands["p-A"] ?? []).find((id) => {
        const c = result.state.cards[id];
        return c?.code === "QS";
      })!
    ]!;
    expect(isDeadCard(result.state, drawnCard)).toBe(true);
    expect(result.state.deadCardExchangeUsed).toBe(true);
  });

  it("rejects exchanging a playable card (CARD_NOT_DEAD)", () => {
    const state = deadHandState(["AC"]);
    expect(() =>
      applyCommand(state, {
        type: "EXCHANGE_DEAD_CARD",
        playerId: "p-A",
        actionId: "a1",
        cardId: handCardId(state, "p-A", "AC"),
      }),
    ).toThrow(expect.objectContaining({ code: "CARD_NOT_DEAD" }) as Error);
  });

  it("rejects exchanging a Jack (INVALID_JACK_TYPE, §41)", () => {
    const state = deadHandState(["JH"]);
    expect(() =>
      applyCommand(state, {
        type: "EXCHANGE_DEAD_CARD",
        playerId: "p-A",
        actionId: "a1",
        cardId: handCardId(state, "p-A", "JH"),
      }),
    ).toThrow(expect.objectContaining({ code: "INVALID_JACK_TYPE" }) as Error);
  });

  it("rejects exchange out of turn (NOT_YOUR_TURN)", () => {
    const state = deadHandState(["AC"]);
    expect(() =>
      applyCommand(state, {
        type: "EXCHANGE_DEAD_CARD",
        playerId: "p-B",
        actionId: "a1",
        cardId: handCardId(state, "p-A", "8H"),
      }),
    ).toThrow(expect.objectContaining({ code: "NOT_YOUR_TURN" }) as Error);
  });

  it("a removed marker makes the card playable again (§28, §116)", () => {
    const pre = scenario().build();
    const coords = codeCoords(pre, "8H");
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JH"])
      .withMarker("B", coords[0]!.row, coords[0]!.column)
      .withMarker("B", coords[1]!.row, coords[1]!.column)
      .build();
    const eightId = Object.keys(state.cards).find(
      (id) => state.cards[id]?.code === "8H",
    )!;
    expect(isDeadCard(state, state.cards[eightId]!)).toBe(true);

    const result = applyCommand(state, {
      type: "PLAY_REMOVE_JACK",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "JH"),
      targetCellId: `r${coords[0]!.row}c${coords[0]!.column}`,
    });
    expect(isDeadCard(result.state, result.state.cards[eightId]!)).toBe(false);
  });

  it("deadness is derived dynamically — never stored on the card (§28)", () => {
    const state = deadHandState();
    const card = eightCard(state);
    // No `dead` property is ever persisted on cards.
    expect(Object.keys(card)).not.toContain("dead");
  });

  it("legal actions expose the exchange as a pre-action (§43–§44)", () => {
    const state = deadHandState(["AC"]);
    const legal = getLegalActions(state, "p-A");
    expect(legal.deadExchanges).toHaveLength(1);
    expect(legal.deadExchanges[0]?.cardId).toBe(
      handCardId(state, "p-A", "8H"),
    );
  });
});

describe("exchange path is replay-deterministic (§102)", () => {
  /**
   * Both seats hold exactly one dead card and the draw pile is empty: each
   * exchange draws the same card back, both turns are skipped and the game
   * ends in a stalemate. The stalemate timestamp is the only clock consumer
   * inside the exchange path, so it must come from the injected clock.
   */
  function deadEndState() {
    const base = startGame(
      createGame({
        players: [
          { id: "p-a", name: "A" },
          { id: "p-b", name: "B" },
        ],
        seed: "exchange-clock",
      }),
    ).state;
    const normalCardId = (pid: string) =>
      (base.hands[pid] ?? []).find(
        (id) => !isJackCode(base.cards[id]!.code),
      )!;
    const aCard = normalCardId("p-a");
    const bCard = normalCardId("p-b");
    const cells = { ...base.board.cells };
    for (const [cardId, playerId] of [
      [aCard, "p-a"],
      [bCard, "p-b"],
    ] as const) {
      const teamId = base.players.find((p) => p.id === playerId)!.teamId;
      for (const id of cardCellsForCode(
        base.boardDefinition,
        base.cards[cardId]!.code,
      )) {
        cells[id] = { occupantTeamId: teamId, occupantPlayerId: playerId };
      }
    }
    return {
      ...base,
      hands: { "p-a": [aCard], "p-b": [bCard] },
      drawPile: [],
      discardPiles: { "p-a": [], "p-b": [] },
      board: { ...base.board, cells },
    };
  }

  it("stalemate after an exchange uses the injected clock, never the wall clock", () => {
    const FIXED = "2020-01-01T00:00:00.000Z";
    const now = () => FIXED;
    let current = deadEndState();
    for (let i = 0; i < 2; i++) {
      const pid = currentPlayerId(current)!;
      const cardId = current.hands[pid]![0]!;
      current = applyCommand(
        current,
        {
          type: "EXCHANGE_DEAD_CARD",
          playerId: pid,
          actionId: `x${i}`,
          cardId,
        },
        { now },
      ).state;
    }
    expect(current.status).toBe("FINISHED");
    expect(current.resultType).toBe("STALEMATE");
    expect(current.finishedAt).toBe(FIXED);
  });
});

describe("dead-card exchange configuration (§29, §104)", () => {
  const players = [
    { id: "p-a", name: "A" },
    { id: "p-b", name: "B" },
  ];

  it("rejects maxDeadCardExchangesPerTurn other than 1 (invariant, not a tunable)", () => {
    for (const max of [0, 2, 5]) {
      expect(() =>
        createGame({ players, maxDeadCardExchangesPerTurn: max }),
      ).toThrow(
        expect.objectContaining({ code: "INVALID_GAME_CONFIG" }) as Error,
      );
    }
  });

  it("accepts the standard single exchange per turn", () => {
    expect(() =>
      createGame({ players, maxDeadCardExchangesPerTurn: 1 }),
    ).not.toThrow();
  });
});
