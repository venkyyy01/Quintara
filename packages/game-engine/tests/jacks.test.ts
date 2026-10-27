/**
 * Required Jack tests (§117, §118) + §35–§40.
 */
import { describe, expect, it } from "vitest";
import {
  applyCommand,
  getLegalActions,
  getRemovalJackLegalTargets,
  getWildJackLegalTargets,
  isDeadCard,
  scenario,
  validateGameState,
} from "../src/index.js";
import { codeCells, codeCoords, handCardId } from "./helpers.js";

describe("Two-Eyed Jacks (§35, §117)", () => {
  it("JC can place on any open normal cell", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .build();
    expect(getWildJackLegalTargets(state).length).toBe(96);
    const actions = getLegalActions(state, "p-A").mainActions;
    expect(actions.length).toBe(96);
    expect(actions.every((a) => a.type === "PLAY_WILD_JACK")).toBe(true);
  });

  it("JD places a marker and follows the wild-Jack resolution", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JD"])
      .withHand("B", ["2C"])
      .build();
    const result = applyCommand(state, {
      type: "PLAY_WILD_JACK",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "JD"),
      targetCellId: "r5c5",
    });
    expect(result.state.board.cells["r5c5"]?.occupantTeamId).toBe("team-1");
    expect(result.events.map((e) => e.type)).toEqual([
      "CARD_PLAYED",
      "MARKER_PLACED",
      "CARD_DRAWN",
      "TURN_COMPLETED",
      "TURN_STARTED",
    ]);
    expect(validateGameState(result.state)).toEqual([]);
  });

  it("cannot target an occupied cell (TARGET_OCCUPIED)", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withMarker("B", 5, 5)
      .build();
    expect(() =>
      applyCommand(state, {
        type: "PLAY_WILD_JACK",
        playerId: "p-A",
        actionId: "a1",
        cardId: handCardId(state, "p-A", "JC"),
        targetCellId: "r5c5",
      }),
    ).toThrow(expect.objectContaining({ code: "TARGET_OCCUPIED" }) as Error);
  });

  it("cannot target wild corners (INVALID_TARGET)", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .build();
    for (const corner of ["r0c0", "r0c9", "r9c0", "r9c9"]) {
      expect(() =>
        applyCommand(state, {
          type: "PLAY_WILD_JACK",
          playerId: "p-A",
          actionId: "a1",
          cardId: handCardId(state, "p-A", "JC"),
          targetCellId: corner,
        }),
      ).toThrow(expect.objectContaining({ code: "INVALID_TARGET" }) as Error);
    }
  });

  it("rejects a non-Jack card through the wild action", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .build();
    expect(() =>
      applyCommand(state, {
        type: "PLAY_WILD_JACK",
        playerId: "p-A",
        actionId: "a1",
        cardId: handCardId(state, "p-A", "8H"),
        targetCellId: "r5c5",
      }),
    ).toThrow(expect.objectContaining({ code: "INVALID_JACK_TYPE" }) as Error);
  });
});

describe("One-Eyed Jacks (§37–§40, §118)", () => {
  it("JH removes an opponent marker without placing its own (§154 order)", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JH"])
      .withHand("B", ["2C"])
      .withMarker("B", 5, 5)
      .build();
    const result = applyCommand(state, {
      type: "PLAY_REMOVE_JACK",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "JH"),
      targetCellId: "r5c5",
    });
    expect(result.state.board.cells["r5c5"]?.occupantTeamId).toBeNull();
    const occupied = Object.values(result.state.board.cells).filter(
      (occ) => occ.occupantTeamId !== null,
    );
    expect(occupied).toHaveLength(0);
    expect(result.events.map((e) => e.type)).toEqual([
      "CARD_PLAYED",
      "MARKER_REMOVED",
      "CARD_DRAWN",
      "TURN_COMPLETED",
      "TURN_STARTED",
    ]);
    expect(validateGameState(result.state)).toEqual([]);
  });

  it("JS behaves identically", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JS"])
      .withMarker("B", 3, 3)
      .build();
    const result = applyCommand(state, {
      type: "PLAY_REMOVE_JACK",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "JS"),
      targetCellId: "r3c3",
    });
    expect(result.state.board.cells["r3c3"]?.occupantTeamId).toBeNull();
  });

  it("cannot remove own marker (CANNOT_TARGET_TEAMMATE)", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JH"])
      .withMarker("A", 5, 5)
      .build();
    expect(() =>
      applyCommand(state, {
        type: "PLAY_REMOVE_JACK",
        playerId: "p-A",
        actionId: "a1",
        cardId: handCardId(state, "p-A", "JH"),
        targetCellId: "r5c5",
      }),
    ).toThrow(
      expect.objectContaining({ code: "CANNOT_TARGET_TEAMMATE" }) as Error,
    );
  });

  it("cannot remove a teammate's marker", () => {
    const state = scenario({ players: 4 })
      .withCurrentPlayer("A")
      .withHand("A", ["JH"])
      .withMarker("B", 5, 5)
      .build();
    expect(() =>
      applyCommand(state, {
        type: "PLAY_REMOVE_JACK",
        playerId: "p-A",
        actionId: "a1",
        cardId: handCardId(state, "p-A", "JH"),
        targetCellId: "r5c5",
      }),
    ).toThrow(
      expect.objectContaining({ code: "CANNOT_TARGET_TEAMMATE" }) as Error,
    );
  });

  it("can remove either opponent's marker in a three-team game", () => {
    const state = scenario({ players: 3 })
      .withCurrentPlayer("A")
      .withHand("A", ["JH", "JS"])
      .withMarker("B", 2, 2)
      .withMarker("C", 3, 3)
      .build();
    const targets = getRemovalJackLegalTargets(state, "team-1");
    expect([...targets].sort()).toEqual(["r2c2", "r3c3"]);
  });

  it("cannot target an empty cell (INVALID_JACK_TARGET)", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JH"])
      .build();
    expect(() =>
      applyCommand(state, {
        type: "PLAY_REMOVE_JACK",
        playerId: "p-A",
        actionId: "a1",
        cardId: handCardId(state, "p-A", "JH"),
        targetCellId: "r5c5",
      }),
    ).toThrow(
      expect.objectContaining({ code: "INVALID_JACK_TARGET" }) as Error,
    );
  });

  it("cannot target a wild corner (INVALID_TARGET)", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JH"])
      .build();
    expect(() =>
      applyCommand(state, {
        type: "PLAY_REMOVE_JACK",
        playerId: "p-A",
        actionId: "a1",
        cardId: handCardId(state, "p-A", "JH"),
        targetCellId: "r0c0",
      }),
    ).toThrow(expect.objectContaining({ code: "INVALID_TARGET" }) as Error);
  });

  it("cannot remove a protected marker (PROTECTED_MARKER, §39, §173)", () => {
    // A passes with AC; B completes a horizontal line (row 5, c1–c5) with a
    // Two-Eyed Jack; A then tries to remove a protected marker with JH.
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["AC", "JH"])
      .withHand("B", ["JC"])
      .withMarker("B", 5, 1)
      .withMarker("B", 5, 2)
      .withMarker("B", 5, 3)
      .withMarker("B", 5, 4)
      .build();

    const aPass = applyCommand(state, {
      type: "PLAY_NORMAL_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "AC"),
      targetCellId: codeCells(state, "AC")[0]!,
    });
    const bLine = applyCommand(aPass.state, {
      type: "PLAY_WILD_JACK",
      playerId: "p-B",
      actionId: "a2",
      cardId: handCardId(aPass.state, "p-B", "JC"),
      targetCellId: "r5c5",
    });
    expect(bLine.state.completedSequences["team-2"]?.length).toBe(1);

    expect(() =>
      applyCommand(bLine.state, {
        type: "PLAY_REMOVE_JACK",
        playerId: "p-A",
        actionId: "a3",
        cardId: handCardId(bLine.state, "p-A", "JH"),
        targetCellId: "r5c3",
      }),
    ).toThrow(expect.objectContaining({ code: "PROTECTED_MARKER" }) as Error);

    // The protected marker is absent from A's legal target list (§173).
    const legal = getLegalActions(bLine.state, "p-A").mainActions;
    expect(legal.some((a) => a.targetCellId === "r5c3")).toBe(false);
  });

  it("removal frees a dead-card board location (§118, §28)", () => {
    const pre = scenario().build();
    const coords = codeCoords(pre, "8H");
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JH"])
      .withMarker("A", 4, 4)
      .withMarker("B", coords[0]!.row, coords[0]!.column)
      .withMarker("B", coords[1]!.row, coords[1]!.column)
      .build();
    const eightId = Object.keys(state.cards).find(
      (id) => state.cards[id]?.code === "8H",
    )!;
    const result = applyCommand(state, {
      type: "PLAY_REMOVE_JACK",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "JH"),
      targetCellId: `r${coords[0]!.row}c${coords[0]!.column}`,
    });
    expect(isDeadCard(result.state, state.cards[eightId]!)).toBe(false);
  });
});
