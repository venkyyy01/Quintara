/**
 * Draw pile exhaustion and reshuffling (§48–§50, §128) + card conservation.
 */
import { describe, expect, it } from "vitest";
import {
  applyCommand,
  countAllCards,
  scenario,
  validateGameState,
} from "../src/index.js";
import { assignAllCards, handCardId } from "./helpers.js";

function cellOf(state: ReturnType<typeof scenario.prototype.build>, code: string): string {
  return state.boardDefinition.cells.find(
    (c) => c.type === "CARD" && c.cardCode === code,
  )!.id;
}

describe("draw pile exhaustion (§48, §128)", () => {
  it("reshuffles discards into a new draw pile when empty", () => {
    // Draw pile has exactly one card. A's main action consumes it; B's next
    // draw must gather discards and reshuffle. All other cards sit in hands.
    const built = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withHand("B", ["2C"])
      .build();
    const eightId = handCardId(built, "p-A", "8H");
    const twoId = handCardId(built, "p-B", "2C");
    const threeCId = Object.keys(built.cards).find(
      (id) => built.cards[id]?.code === "3C",
    )!;

    const state = assignAllCards(
      built,
      { "p-A": [eightId], "p-B": [twoId] },
      [threeCId],
      "p-B", // remainder of 101 cards in B's hand keeps discards exact
    );

    const afterA = applyCommand(state, {
      type: "PLAY_NORMAL_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: eightId,
      targetCellId: cellOf(state, "8H"),
    });
    // A drew the final card; pile is now empty.
    expect(afterA.state.drawPile).toHaveLength(0);
    expect(afterA.state.hands["p-A"]?.[0]).toBe(threeCId);

    const afterB = applyCommand(afterA.state, {
      type: "PLAY_NORMAL_CARD",
      playerId: "p-B",
      actionId: "a2",
      cardId: twoId,
      targetCellId: cellOf(afterA.state, "2C"),
    });

    // Reshuffle happened: exactly the two discards became the new draw pile.
    const reshuffled = afterB.events.find(
      (e) => e.type === "DECK_RESHUFFLED",
    ) as { discardedCount: number } | undefined;
    expect(reshuffled).toBeDefined();
    expect(reshuffled?.discardedCount).toBe(2);
    expect(afterB.events.some((e) => e.type === "CARD_DRAWN")).toBe(true);

    // Card conservation (§128, §133): always 104 across all zones.
    expect(countAllCards(afterB.state)).toBe(104);
    expect(afterB.state.discardPiles["p-A"]).toHaveLength(0);
    expect(afterB.state.discardPiles["p-B"]).toHaveLength(0);
    expect(validateGameState(afterB.state)).toEqual([]);
  });

  it("the just-played card may return via reshuffle (§50)", () => {
    // Empty draw pile: A's discarded 8H is the only card available and must
    // be reshuffled back immediately — it is not artificially excluded.
    const built = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withHand("B", ["2C"])
      .build();
    const eightId = handCardId(built, "p-A", "8H");
    const twoId = handCardId(built, "p-B", "2C");
    const state = assignAllCards(
      built,
      { "p-A": [eightId], "p-B": [twoId] },
      [],
      "p-B",
    );

    const result = applyCommand(state, {
      type: "PLAY_NORMAL_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: eightId,
      targetCellId: cellOf(state, "8H"),
    });

    expect(result.state.hands["p-A"]).toContain(eightId);
    expect(countAllCards(result.state)).toBe(104);
    expect(validateGameState(result.state)).toEqual([]);
  });

  it("never reshuffles cards that are in players' hands (§49)", () => {
    const built = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withHand("B", ["2C"])
      .build();
    const eightId = handCardId(built, "p-A", "8H");
    const twoId = handCardId(built, "p-B", "2C");
    const threeCId = Object.keys(built.cards).find(
      (id) => built.cards[id]?.code === "3C",
    )!;
    const state = assignAllCards(
      built,
      { "p-A": [eightId], "p-B": [twoId] },
      [threeCId],
      "p-A", // remainder in A's hand — must never enter a reshuffle
    );
    const aHeld = (state.hands["p-A"] ?? []).filter((id) => id !== eightId);

    const afterA = applyCommand(state, {
      type: "PLAY_NORMAL_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: eightId,
      targetCellId: cellOf(state, "8H"),
    });
    const afterB = applyCommand(afterA.state, {
      type: "PLAY_NORMAL_CARD",
      playerId: "p-B",
      actionId: "a2",
      cardId: twoId,
      targetCellId: cellOf(afterA.state, "2C"),
    });

    // A's held cards were never cycled away.
    for (const id of aHeld) {
      expect(afterB.state.hands["p-A"]).toContain(id);
      expect(afterB.state.drawPile).not.toContain(id);
    }
    expect(countAllCards(afterB.state)).toBe(104);
  });

  it("keeps exactly 104 cards across every zone mid-game (§19, §133)", () => {
    let state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withHand("B", ["2C"])
      .build();
    expect(countAllCards(state)).toBe(104);

    state = applyCommand(state, {
      type: "PLAY_NORMAL_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "8H"),
      targetCellId: cellOf(state, "8H"),
    }).state;
    expect(countAllCards(state)).toBe(104);
    expect(validateGameState(state)).toEqual([]);
  });
});
