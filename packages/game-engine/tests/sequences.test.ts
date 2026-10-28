/**
 * Required sequence tests (§120–§125) + §51–§57, §119–§121.
 */
import { describe, expect, it } from "vitest";
import {
  applyCommand,
  detectCandidateSequences,
  scenario,
  validateGameState,
  type GameState,
} from "../src/index.js";
import { handCardId } from "./helpers.js";

/** Plays a Two-Eyed Jack at the given cell for the current player. */
function playJackAt(
  state: GameState,
  playerId: string,
  cell: string,
  actionId = "a",
) {
  const jackCode = (state.hands[playerId] ?? []).some(
    (id) => state.cards[id]?.code === "JC",
  )
    ? "JC"
    : "JD";
  return applyCommand(state, {
    type: "PLAY_WILD_JACK",
    playerId,
    actionId,
    cardId: handCardId(state, playerId, jackCode),
    targetCellId: cell,
  });
}

describe("basic sequence detection (§120)", () => {
  it("detects a horizontal five", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .withMarker("A", 5, 4)
      .build();
    const result = playJackAt(state, "p-A", "r5c5");
    const sequences = result.state.completedSequences["team-1"] ?? [];
    expect(sequences).toHaveLength(1);
    expect(sequences[0]?.direction).toBe("HORIZONTAL");
    expect(sequences[0]?.cells).toEqual([
      "r5c1",
      "r5c2",
      "r5c3",
      "r5c4",
      "r5c5",
    ]);
    expect(validateGameState(result.state)).toEqual([]);
  });

  it("detects a vertical five", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 1, 5)
      .withMarker("A", 2, 5)
      .withMarker("A", 3, 5)
      .withMarker("A", 4, 5)
      .build();
    const result = playJackAt(state, "p-A", "r5c5");
    const sequences = result.state.completedSequences["team-1"] ?? [];
    expect(sequences).toHaveLength(1);
    expect(sequences[0]?.direction).toBe("VERTICAL");
  });

  it("detects a diagonal down-right five", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 1, 1)
      .withMarker("A", 2, 2)
      .withMarker("A", 3, 3)
      .withMarker("A", 4, 4)
      .build();
    const result = playJackAt(state, "p-A", "r5c5");
    expect(result.state.completedSequences["team-1"]?.[0]?.direction).toBe(
      "DIAGONAL_DOWN",
    );
  });

  it("detects a diagonal up-right five", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 8, 1)
      .withMarker("A", 7, 2)
      .withMarker("A", 6, 3)
      .withMarker("A", 5, 4)
      .build();
    const result = playJackAt(state, "p-A", "r4c5");
    const sequences = result.state.completedSequences["team-1"] ?? [];
    expect(sequences).toHaveLength(1);
    expect(sequences[0]?.direction).toBe("DIAGONAL_UP");
  });

  it("handles boundary lines (top row, bottom row, edges)", () => {
    // Top row (r0c4..r0c8) — completing at the left end keeps the window
    // unique even though the wild corner (0,9) extends the run.
    const top = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 0, 5)
      .withMarker("A", 0, 6)
      .withMarker("A", 0, 7)
      .withMarker("A", 0, 8)
      .build();
    const topResult = playJackAt(top, "p-A", "r0c4");
    const topSeq = topResult.state.completedSequences["team-1"] ?? [];
    expect(topSeq).toHaveLength(1);
    expect([...topSeq[0]!.cells].sort().join(",")).toBe(
      "r0c4,r0c5,r0c6,r0c7,r0c8",
    );

    // Bottom row (r9c4..r9c8), completed at the left end.
    const bottom = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 9, 5)
      .withMarker("A", 9, 6)
      .withMarker("A", 9, 7)
      .withMarker("A", 9, 8)
      .build();
    const bottomResult = playJackAt(bottom, "p-A", "r9c4");
    expect(bottomResult.state.completedSequences["team-1"]).toHaveLength(1);

    // Left edge vertical (r5c0..r1c0? use r2c0..r6c0).
    const left = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 2, 0)
      .withMarker("A", 3, 0)
      .withMarker("A", 4, 0)
      .withMarker("A", 5, 0)
      .build();
    const leftResult = playJackAt(left, "p-A", "r6c0");
    expect(leftResult.state.completedSequences["team-1"]).toHaveLength(1);

    // Right edge vertical.
    const right = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 2, 9)
      .withMarker("A", 3, 9)
      .withMarker("A", 4, 9)
      .withMarker("A", 5, 9)
      .build();
    const rightResult = playJackAt(right, "p-A", "r6c9");
    expect(rightResult.state.completedSequences["team-1"]).toHaveLength(1);
  });
});

describe("non-sequences (§121)", () => {
  it("four contiguous markers form no sequence", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .build();
    const candidates = detectCandidateSequences(state, "team-1", "r5c4");
    // Placing at c4 would give 4 — window too short.
    expect(candidates).toHaveLength(0);
  });

  it("five with a gap is not a sequence", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 4)
      .withMarker("A", 5, 5)
      .build();
    // The gap at (5,3) breaks the row; extending at (5,6) creates no five.
    const result = playJackAt(state, "p-A", "r5c6");
    expect(result.state.completedSequences["team-1"] ?? []).toHaveLength(0);
    expect(
      detectCandidateSequences(result.state, "team-1", "r5c6"),
    ).toHaveLength(0);
  });

  it("five containing an opponent marker is not a sequence", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("B", 5, 3)
      .withMarker("A", 5, 4)
      .build();
    const result = playJackAt(state, "p-A", "r5c5");
    expect(result.state.completedSequences["team-1"] ?? []).toHaveLength(0);
  });

  it("five containing an empty cell is not a sequence", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .build();
    // Placing at r5c5 leaves r5c4 empty → no five in a row.
    const result = playJackAt(state, "p-A", "r5c5");
    expect(result.state.completedSequences["team-1"] ?? []).toHaveLength(0);
  });

  it("a bent shape is not a sequence", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .withMarker("A", 6, 3)
      .build();
    const result = playJackAt(state, "p-A", "r7c3");
    expect(result.state.completedSequences["team-1"] ?? []).toHaveLength(0);
  });

  it("a line never wraps from one row edge to the next", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 7)
      .withMarker("A", 5, 8)
      .withMarker("A", 5, 9)
      .withMarker("A", 6, 0)
      .build();
    const result = playJackAt(state, "p-A", "r6c1");
    expect(result.state.completedSequences["team-1"] ?? []).toHaveLength(0);
  });
});

describe("wild corners (§14, §119)", () => {
  it("four markers plus a corner form a sequence", () => {
    // Corner (0,0) + markers (0,1..0,4).
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 0, 1)
      .withMarker("A", 0, 2)
      .withMarker("A", 0, 3)
      .build();
    const result = playJackAt(state, "p-A", "r0c4");
    const sequences = result.state.completedSequences["team-1"] ?? [];
    expect(sequences).toHaveLength(1);
    expect(sequences[0]?.cells).toEqual([
      "r0c0",
      "r0c1",
      "r0c2",
      "r0c3",
      "r0c4",
    ]);
    expect(validateGameState(result.state)).toEqual([]);
  });

  it("a corner plus three markers is not a sequence", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 0, 1)
      .withMarker("A", 0, 2)
      .build();
    const candidates = detectCandidateSequences(state, "team-1", "r0c3");
    expect(candidates).toHaveLength(0);
  });

  it("the same corner can be used by two different teams", () => {
    // Team 1 completes along the top row through (0,0).
    const team1 = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["JC"])
      .withMarker("A", 0, 1)
      .withMarker("A", 0, 2)
      .withMarker("A", 0, 3)
      .build();
    const r1 = playJackAt(team1, "p-A", "r0c4");
    expect(r1.state.completedSequences["team-1"]).toHaveLength(1);

    // Team 2 completes a diagonal through the same corner.
    const team2 = scenario()
      .withCurrentPlayer("B")
      .withHand("B", ["JC"])
      .withHand("A", ["2C"])
      .withMarker("B", 1, 1)
      .withMarker("B", 2, 2)
      .withMarker("B", 3, 3)
      .build();
    const r2 = playJackAt(team2, "p-B", "r4c4");
    expect(r2.state.completedSequences["team-2"]).toHaveLength(1);
  });

  it("a corner can participate in multiple compatible sequences of one team (§59)", () => {
    // Top row through (0,0) AND diagonal through (0,0): share only the corner.
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC", "JD"])
      .withHand("B", ["JC"])
      .withMarker("A", 0, 1)
      .withMarker("A", 0, 2)
      .withMarker("A", 0, 3)
      .withMarker("A", 1, 1)
      .withMarker("A", 2, 2)
      .withMarker("A", 3, 3)
      .build();
    // Register the horizontal first.
    const first = playJackAt(state, "p-A", "r0c4");
    expect(first.state.completedSequences["team-1"]).toHaveLength(1);

    // Give B a turn, then A completes the diagonal.
    const afterB = playJackAt(first.state, "p-B", "r8c8");
    const second = playJackAt(afterB.state, "p-A", "r4c4", "a2");
    const sequences = second.state.completedSequences["team-1"] ?? [];
    expect(sequences).toHaveLength(2);
    // They share exactly the corner cell.
    expect(
      sequences[0]?.cells.filter((c) => sequences[1]?.cells.includes(c)),
    ).toEqual(["r0c0"]);
    expect(validateGameState(second.state)).toEqual([]);
  });
});

describe("long runs (§56, §122)", () => {
  /**
   * Builds one team's contiguous run of `count` cells on row 5 (c1..cN),
   * with the final placement completing it at c5.
   */
  function completeRun(count: number): GameState {
    const builder = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .withMarker("A", 5, 4);
    for (let col = 6; col <= count; col++) {
      builder.withMarker("A", 5, col);
    }
    const state = builder.build();
    const result = playJackAt(state, "p-A", "r5c5");
    // If the claim is ambiguous, take the default option (§68).
    if (result.state.turnPhase === "AWAITING_SEQUENCE_SELECTION") {
      const option = (result.state.pendingSequenceOptions ?? [])[0]!;
      return applyCommand(result.state, {
        type: "SELECT_SEQUENCE_SET",
        playerId: "p-A",
        actionId: "a2",
        sequenceCellSets: option.sequences.map((s) => [...s.cells]),
      }).state;
    }
    return result.state;
  }

  it("5 contiguous → exactly 1 sequence", () => {
    const state = completeRun(5);
    expect(state.completedSequences["team-1"]).toHaveLength(1);
    expect(state.completedSequences["team-2"] ?? []).toHaveLength(0);
  });

  it("6 contiguous → exactly 1 sequence", () => {
    const state = completeRun(6);
    expect(state.completedSequences["team-1"]).toHaveLength(1);
  });

  it("7 contiguous → exactly 1 sequence", () => {
    const state = completeRun(7);
    expect(state.completedSequences["team-1"]).toHaveLength(1);
  });

  it("8 contiguous → exactly 1 sequence", () => {
    const state = completeRun(8);
    expect(state.completedSequences["team-1"]).toHaveLength(1);
  });

  it("9 contiguous markers can yield 2 sequences sharing one cell (§56, §125)", () => {
    // Build 1..4 and 6..9 for team A, then complete at 5.
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .withMarker("A", 5, 4)
      .withMarker("A", 5, 6)
      .withMarker("A", 5, 7)
      .withMarker("A", 5, 8)
      .withMarker("A", 5, 9)
      .build();
    const result = playJackAt(state, "p-A", "r5c5");
    const sequences = result.state.completedSequences["team-1"] ?? [];
    expect(sequences).toHaveLength(2);
    const sorted = sequences.map((s) => [...s.cells].sort().join(","));
    expect(sorted).toContain("r5c1,r5c2,r5c3,r5c4,r5c5");
    expect(sorted).toContain("r5c5,r5c6,r5c7,r5c8,r5c9");
    // They share exactly one cell.
    const shared = sequences[0]!.cells.filter((c) =>
      sequences[1]!.cells.includes(c),
    );
    expect(shared).toEqual(["r5c5"]);
    // §125: verify win in a two-side Standard game.
    expect(result.state.status).toBe("FINISHED");
    expect(result.state.winnerTeamId).toBe("team-1");
    expect(validateGameState(result.state)).toEqual([]);
  });
});

describe("ambiguous six-run (§63–§66, §124)", () => {
  it("enters AWAITING_SEQUENCE_SELECTION with two equal options", () => {
    // Run of 6 at r5c1..r5c6 with the final placement at r5c3.
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 4)
      .withMarker("A", 5, 5)
      .withMarker("A", 5, 6)
      .build();
    const result = playJackAt(state, "p-A", "r5c3");

    expect(result.state.turnPhase).toBe("AWAITING_SEQUENCE_SELECTION");
    const options = result.state.pendingSequenceOptions ?? [];
    expect(options).toHaveLength(2);
    const keys = options.map((o) =>
      [...o.sequences[0]!.cells].sort().join(","),
    );
    expect(keys.sort()).toEqual([
      "r5c1,r5c2,r5c3,r5c4,r5c5",
      "r5c2,r5c3,r5c4,r5c5,r5c6",
    ]);
    // No sequence registered yet.
    expect(result.state.completedSequences["team-1"] ?? []).toHaveLength(0);
    expect(result.events.some((e) => e.type === "SEQUENCE_SELECTION_REQUIRED")).toBe(
      true,
    );
  });

  it("attributes a pending selection to the placement action (§66)", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 4)
      .withMarker("A", 5, 5)
      .withMarker("A", 5, 6)
      .build();
    const pending = playJackAt(state, "p-A", "r5c3", "place-7");
    expect(pending.state.pendingSequenceActionId).toBe("place-7");
    expect(validateGameState(pending.state)).toEqual([]);

    const selected = applyCommand(pending.state, {
      type: "SELECT_SEQUENCE_SET",
      playerId: "p-A",
      actionId: "choose-8",
      sequenceCellSets: [["r5c1", "r5c2", "r5c3", "r5c4", "r5c5"]],
    });
    const sequence = selected.state.completedSequences["team-1"]?.[0];
    expect(sequence?.createdByActionId).toBe("place-7");
    expect(selected.state.pendingSequenceActionId).toBeNull();
    expect(validateGameState(selected.state)).toEqual([]);
  });

  it("credits a selection-win to the placement action", () => {
    const state = scenario({ players: 3 })
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 4)
      .withMarker("A", 5, 5)
      .withMarker("A", 5, 6)
      .build();
    const pending = playJackAt(state, "p-A", "r5c3", "place-win");
    expect(pending.state.turnPhase).toBe("AWAITING_SEQUENCE_SELECTION");

    const selected = applyCommand(pending.state, {
      type: "SELECT_SEQUENCE_SET",
      playerId: "p-A",
      actionId: "choose-win",
      sequenceCellSets: [["r5c1", "r5c2", "r5c3", "r5c4", "r5c5"]],
    });
    expect(selected.state.status).toBe("FINISHED");
    const won = selected.events.find((event) => event.type === "GAME_WON");
    expect(won).toMatchObject({ winningActionId: "place-win" });
    expect(validateGameState(selected.state)).toEqual([]);
  });

  it("registers exactly the player's selected window and protects it (§67, §124)", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 4)
      .withMarker("A", 5, 5)
      .withMarker("A", 5, 6)
      .build();
    const pending = playJackAt(state, "p-A", "r5c3");

    const selected = applyCommand(pending.state, {
      type: "SELECT_SEQUENCE_SET",
      playerId: "p-A",
      actionId: "a2",
      sequenceCellSets: [["r5c1", "r5c2", "r5c3", "r5c4", "r5c5"]],
    });

    const sequences = selected.state.completedSequences["team-1"] ?? [];
    expect(sequences).toHaveLength(1);
    expect([...sequences[0]!.cells].sort().join(",")).toBe(
      "r5c1,r5c2,r5c3,r5c4,r5c5",
    );
    // The selected window is protected; the unselected edge cell is not.
    expect(selected.state.sequenceMembership["r5c1"]).toBeDefined();
    expect(selected.state.sequenceMembership["r5c5"]).toBeDefined();
    expect(selected.state.sequenceMembership["r5c6"]).toBeUndefined();
    expect(selected.state.turnPhase).toBe("AWAITING_MAIN_ACTION");
    expect(validateGameState(selected.state)).toEqual([]);
  });

  it("rejects a selection that is not one of the computed options (§67)", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 4)
      .withMarker("A", 5, 5)
      .withMarker("A", 5, 6)
      .build();
    const pending = playJackAt(state, "p-A", "r5c3");
    expect(() =>
      applyCommand(pending.state, {
        type: "SELECT_SEQUENCE_SET",
        playerId: "p-A",
        actionId: "a2",
        sequenceCellSets: [["r5c1", "r5c2", "r5c3", "r5c4", "r5c6"]],
      }),
    ).toThrow(
      expect.objectContaining({ code: "INVALID_SEQUENCE_SELECTION" }) as Error,
    );
  });
});

describe("crossing sequences (§57–§58, §123)", () => {
  it("horizontal + vertical sharing one marker both count", () => {
    // Cross centered on r5c5: horizontal c2..c6 minus c5, vertical r2..r6
    // minus r5.
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .withMarker("A", 5, 4)
      .withMarker("A", 5, 6)
      .withMarker("A", 2, 5)
      .withMarker("A", 3, 5)
      .withMarker("A", 4, 5)
      .withMarker("A", 6, 5)
      .build();
    const result = playJackAt(state, "p-A", "r5c5");
    const sequences = result.state.completedSequences["team-1"] ?? [];
    expect(sequences).toHaveLength(2);
    const dirs = sequences.map((s) => s.direction).sort();
    expect(dirs).toEqual(["HORIZONTAL", "VERTICAL"]);
  });

  it("horizontal + diagonal sharing one marker both count", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .withMarker("A", 5, 4)
      .withMarker("A", 5, 6)
      .withMarker("A", 2, 2)
      .withMarker("A", 3, 3)
      .withMarker("A", 4, 4)
      .withMarker("A", 6, 6)
      .build();
    const result = playJackAt(state, "p-A", "r5c5");
    const dirs = (result.state.completedSequences["team-1"] ?? [])
      .map((s) => s.direction)
      .sort();
    expect(dirs).toEqual(["DIAGONAL_DOWN", "HORIZONTAL"]);
  });

  it("vertical + diagonal sharing one marker both count", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 2, 5)
      .withMarker("A", 3, 5)
      .withMarker("A", 4, 5)
      .withMarker("A", 6, 5)
      .withMarker("A", 2, 2)
      .withMarker("A", 3, 3)
      .withMarker("A", 4, 4)
      .withMarker("A", 6, 6)
      .build();
    const result = playJackAt(state, "p-A", "r5c5");
    const dirs = (result.state.completedSequences["team-1"] ?? [])
      .map((s) => s.direction)
      .sort();
    expect(dirs).toEqual(["DIAGONAL_DOWN", "VERTICAL"]);
    expect(validateGameState(result.state)).toEqual([]);
  });

  it("detection is invariant to the order of pre-existing markers", () => {
    const complete = (order: readonly number[]) => {
      const builder = scenario()
        .withCurrentPlayer("A")
        .withHand("A", ["JC"])
        .withHand("B", ["2C"]);
      for (const column of order) {
        builder.withMarker("A", 5, column);
      }
      const result = playJackAt(builder.build(), "p-A", "r5c5");
      return (result.state.completedSequences["team-1"] ?? [])
        .map((sequence) => [...sequence.cells].sort().join(","))
        .sort();
    };

    const ascending = complete([1, 2, 3, 4, 6, 7, 8, 9]);
    const shuffled = complete([9, 2, 7, 4, 1, 8, 3, 6]);
    expect(shuffled).toEqual(ascending);
    expect(ascending).toHaveLength(2);
  });

  it("two diagonals sharing one marker both count", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("B", ["2C"])
      .withMarker("A", 2, 2)
      .withMarker("A", 3, 3)
      .withMarker("A", 4, 4)
      .withMarker("A", 6, 6)
      .withMarker("A", 2, 8)
      .withMarker("A", 3, 7)
      .withMarker("A", 4, 6)
      .withMarker("A", 6, 4)
      .build();
    const result = playJackAt(state, "p-A", "r5c5");
    const dirs = (result.state.completedSequences["team-1"] ?? [])
      .map((s) => s.direction)
      .sort();
    expect(dirs).toEqual(["DIAGONAL_DOWN", "DIAGONAL_UP"]);
  });
});
