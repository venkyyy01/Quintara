/**
 * Victory evaluation (§73, §100, §126) + victory-before-draw (§47).
 */
import { describe, expect, it } from "vitest";
import {
  applyCommand,
  checkVictory,
  scenario,
  validateGameState,
} from "../src/index.js";
import { handCardId } from "./helpers.js";

describe("victory requirements (§3, §73)", () => {
  it("requires 2 sequences in a two-side game — 1 is not enough", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .withMarker("A", 5, 4)
      .build();
    const result = applyCommand(state, {
      type: "PLAY_WILD_JACK",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "JC"),
      targetCellId: "r5c5",
    });
    expect(result.state.completedSequences["team-1"]).toHaveLength(1);
    expect(checkVictory(result.state, "team-1")).toBe(false);
    expect(result.state.status).toBe("ACTIVE");
    expect(result.state.winnerTeamId).toBeNull();
  });

  it("a single sequence wins in a three-side game (§3, §178)", () => {
    const state = scenario({ players: 3 })
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .withMarker("A", 5, 4)
      .build();
    const result = applyCommand(state, {
      type: "PLAY_WILD_JACK",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "JC"),
      targetCellId: "r5c5",
    });
    expect(result.state.status).toBe("FINISHED");
    expect(result.state.winnerTeamId).toBe("team-1");
    expect(result.state.resultType).toBe("WIN");
    expect(result.state.turnPhase).toBe("GAME_OVER");
    expect(result.state.finishedAt).not.toBeNull();
    expect(validateGameState(result.state)).toEqual([]);
  });

  it("reaching 2 sequences wins a two-side game", () => {
    // First line on row 5; second line on row 7 completed later.
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC", "JD"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .withMarker("A", 5, 4)
      .withMarker("A", 7, 1)
      .withMarker("A", 7, 2)
      .withMarker("A", 7, 3)
      .withMarker("A", 7, 4)
      .build();
    const first = applyCommand(state, {
      type: "PLAY_WILD_JACK",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "JC"),
      targetCellId: "r5c5",
    });
    expect(first.state.status).toBe("ACTIVE");
    // B plays elsewhere.
    const afterB = applyCommand(first.state, {
      type: "PLAY_NORMAL_CARD",
      playerId: "p-B",
      actionId: "a2",
      cardId: handCardId(first.state, "p-B", "2C"),
      targetCellId: first.state.boardDefinition.cells.find(
        (c) => c.type === "CARD" && c.cardCode === "2C",
      )!.id,
    });
    const second = applyCommand(afterB.state, {
      type: "PLAY_WILD_JACK",
      playerId: "p-A",
      actionId: "a3",
      cardId: handCardId(afterB.state, "p-A", "JD"),
      targetCellId: "r7c5",
    });
    expect(second.state.status).toBe("FINISHED");
    expect(second.state.winnerTeamId).toBe("team-1");
    expect(validateGameState(second.state)).toEqual([]);
  });
});

describe("simultaneous double-sequence win (§57, §126)", () => {
  it("registers both crossing lines and wins immediately", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      // Horizontal c2..c6 minus c5.
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .withMarker("A", 5, 4)
      .withMarker("A", 5, 6)
      // Vertical r2..r6 minus r5.
      .withMarker("A", 2, 5)
      .withMarker("A", 3, 5)
      .withMarker("A", 4, 5)
      .withMarker("A", 6, 5)
      .build();
    const result = applyCommand(state, {
      type: "PLAY_WILD_JACK",
      playerId: "p-A",
      actionId: "win-move",
      cardId: handCardId(state, "p-A", "JC"),
      targetCellId: "r5c5",
    });

    expect(result.state.completedSequences["team-1"]).toHaveLength(2);
    expect(result.state.status).toBe("FINISHED");
    expect(result.state.winnerTeamId).toBe("team-1");

    // §152 event order: no CARD_DRAWN / TURN_COMPLETED / TURN_STARTED after
    // the win.
    const types = result.events.map((e) => e.type);
    expect(types).toEqual([
      "CARD_PLAYED",
      "MARKER_PLACED",
      "SEQUENCE_COMPLETED",
      "SEQUENCE_COMPLETED",
      "GAME_WON",
    ]);
    const won = result.events.find((e) => e.type === "GAME_WON") as {
      winnerTeamId: string;
      winningActionId: string;
      winningPlayerId: string;
    };
    expect(won.winnerTeamId).toBe("team-1");
    expect(won.winningActionId).toBe("win-move");
    expect(won.winningPlayerId).toBe("p-A");
  });

  it("does not draw a replacement card on the winning turn (§47)", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC", "AC"])
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .withMarker("A", 5, 4)
      .withMarker("A", 5, 6)
      .withMarker("A", 2, 5)
      .withMarker("A", 3, 5)
      .withMarker("A", 4, 5)
      .withMarker("A", 6, 5)
      .build();
    const result = applyCommand(state, {
      type: "PLAY_WILD_JACK",
      playerId: "p-A",
      actionId: "win-move",
      cardId: handCardId(state, "p-A", "JC"),
      targetCellId: "r5c5",
    });
    // Hand holds only the unplayed AC (JC discarded, no replacement drawn).
    expect(result.state.hands["p-A"]).toHaveLength(1);
    expect(result.state.hands["p-A"]?.[0]).toBe(handCardId(state, "p-A", "AC"));
    expect(result.events.some((e) => e.type === "CARD_DRAWN")).toBe(false);
    // Discarded card is in A's discard pile.
    expect(result.state.discardPiles["p-A"]).toEqual([
      handCardId(state, "p-A", "JC"),
    ]);
  });
});

describe("game end behaviour (§100)", () => {
  it("rejects all gameplay commands after GAME_OVER", () => {
    const state = scenario({ players: 3 })
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .withMarker("A", 5, 4)
      .build();
    const finished = applyCommand(state, {
      type: "PLAY_WILD_JACK",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "JC"),
      targetCellId: "r5c5",
    });
    expect(finished.state.status).toBe("FINISHED");
    expect(() =>
      applyCommand(finished.state, {
        type: "PLAY_NORMAL_CARD",
        playerId: "p-B",
        actionId: "a2",
        cardId: "anything",
        targetCellId: "r0c1",
      }),
    ).toThrow(
      expect.objectContaining({ code: "GAME_NOT_ACTIVE" }) as Error,
    );
  });
});
