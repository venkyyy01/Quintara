/**
 * Turn advancement, no-legal-action safeguard and stalemate
 * (§75–§78, §167).
 */
import { describe, expect, it } from "vitest";
import {
  applyCommand,
  scenario,
  validateGameState,
} from "../src/index.js";
import { codeCoords, handCardId } from "./helpers.js";

function cellOf(
  state: ReturnType<typeof scenario.prototype.build>,
  code: string,
): string {
  return state.boardDefinition.cells.find(
    (c) => c.type === "CARD" && c.cardCode === code,
  )!.id;
}

describe("no-legal-action safeguard (§75)", () => {
  it("skips a player with zero legal actions and no exchange available", () => {
    // B has an empty hand → at B's turn start there is nothing to do.
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withHand("B", [])
      .build();
    const result = applyCommand(state, {
      type: "PLAY_NORMAL_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "8H"),
      targetCellId: cellOf(state, "8H"),
    });

    const types = result.events.map((e) => e.type);
    expect(types).toContain("TURN_SKIPPED_NO_LEGAL_ACTION");
    // Turn advanced past B back to A.
    expect(result.state.turnOrder[result.state.currentTurnIndex]).toBe("p-A");
    expect(validateGameState(result.state)).toEqual([]);
  });

  it("handles the pathological exchange-then-stuck case (§75)", () => {
    // A's only card is dead; the replacement drawn is also dead. A must
    // exchange, then the engine skips the turn without deadlocking.
    const pre = scenario().build();
    const eight = codeCoords(pre, "8H");
    const qs = codeCoords(pre, "QS");
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withHand("B", ["2C"])
      .withDrawPile(["QS"])
      .withMarker("A", eight[0]!.row, eight[0]!.column)
      .withMarker("B", eight[1]!.row, eight[1]!.column)
      .withMarker("A", qs[0]!.row, qs[0]!.column)
      .withMarker("B", qs[1]!.row, qs[1]!.column)
      .build();
    // QS must be the top of the draw pile for the exchange to draw it.

    const result = applyCommand(state, {
      type: "EXCHANGE_DEAD_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "8H"),
    });

    // Replacement QS is dead, exchange used → skip (hand unchanged after the
    // exchange, no extra draw) and turn advances to B.
    const types = result.events.map((e) => e.type);
    expect(types).toContain("DEAD_CARD_EXCHANGED");
    expect(types).toContain("TURN_SKIPPED_NO_LEGAL_ACTION");
    expect(result.state.turnOrder[result.state.currentTurnIndex]).toBe("p-B");
    // Hand unchanged after exchange: exactly the drawn QS.
    expect(result.state.hands["p-A"]).toHaveLength(1);
    expect(validateGameState(result.state)).toEqual([]);
  });

  it("does not skip when at least one legal action exists (§76)", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withHand("B", ["2C"])
      .build();
    const result = applyCommand(state, {
      type: "PLAY_NORMAL_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "8H"),
      targetCellId: cellOf(state, "8H"),
    });
    expect(
      result.events.some((e) => e.type === "TURN_SKIPPED_NO_LEGAL_ACTION"),
    ).toBe(false);
    expect(result.state.turnOrder[result.state.currentTurnIndex]).toBe("p-B");
  });

  it("emits deterministic skip event ordering (§152)", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withHand("B", [])
      .build();
    const result = applyCommand(state, {
      type: "PLAY_NORMAL_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "8H"),
      targetCellId: cellOf(state, "8H"),
    });
    const types = result.events.map((e) => e.type);
    expect(types).toEqual([
      "CARD_PLAYED",
      "MARKER_PLACED",
      "CARD_DRAWN",
      "TURN_COMPLETED",
      "TURN_STARTED", // B
      "TURN_SKIPPED_NO_LEGAL_ACTION",
      "TURN_STARTED", // A again
    ]);
  });
});

describe("terminal stalemate safeguard (§167)", () => {
  it("declares STALEMATE after a full rotation with no board change", () => {
    // Fill the entire board so every normal card is dead and Jacks have no
    // legal target. Both players can only exchange dead cards forever.
    const builder = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withHand("B", ["9H"]);
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const isCorner =
          (row === 0 || row === 9) && (col === 0 || col === 9);
        if (isCorner) continue;
        builder.withMarker((row + col) % 2 === 0 ? "A" : "B", row, col);
      }
    }
    const state = builder.build();

    // A exchanges (only action), gets a dead replacement, gets skipped.
    const afterA = applyCommand(state, {
      type: "EXCHANGE_DEAD_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "8H"),
    });
    expect(
      afterA.events.some((e) => e.type === "TURN_SKIPPED_NO_LEGAL_ACTION"),
    ).toBe(true);
    expect(afterA.state.status).toBe("ACTIVE");

    // B does the same → second consecutive skip completes a full rotation
    // with no board change → STALEMATE.
    const afterB = applyCommand(afterA.state, {
      type: "EXCHANGE_DEAD_CARD",
      playerId: "p-B",
      actionId: "a2",
      cardId: handCardId(afterA.state, "p-B", "9H"),
    });
    expect(afterB.state.status).toBe("FINISHED");
    expect(afterB.state.resultType).toBe("STALEMATE");
    expect(afterB.state.winnerTeamId).toBeNull();
    expect(afterB.events.some((e) => e.type === "GAME_STALEMATED")).toBe(true);
    expect(validateGameState(afterB.state)).toEqual([]);
  });
});

describe("turn bookkeeping (§77)", () => {
  it("resets deadCardExchangeUsed for the new turn", () => {
    const pre = scenario().build();
    const eight = codeCoords(pre, "8H");
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H", "AC"])
      .withHand("B", ["2C"])
      .withMarker("A", eight[0]!.row, eight[0]!.column)
      .withMarker("B", eight[1]!.row, eight[1]!.column)
      .build();

    const exchanged = applyCommand(state, {
      type: "EXCHANGE_DEAD_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "8H"),
    });
    expect(exchanged.state.deadCardExchangeUsed).toBe(true);

    const played = applyCommand(exchanged.state, {
      type: "PLAY_NORMAL_CARD",
      playerId: "p-A",
      actionId: "a2",
      cardId: handCardId(exchanged.state, "p-A", "AC"),
      targetCellId: cellOf(exchanged.state, "AC"),
    });
    // B's new turn has a fresh exchange allowance.
    expect(played.state.deadCardExchangeUsed).toBe(false);
    expect(played.state.turnNumber).toBeGreaterThan(state.turnNumber);
    expect(validateGameState(played.state)).toEqual([]);
  });
});
