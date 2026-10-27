/**
 * Overlap rules and maximum-compatible-set resolution (§56–§58, §63–§68).
 */
import { describe, expect, it } from "vitest";
import {
  applyCommand,
  defaultSequenceOption,
  filterClaimableCandidates,
  findMaximumCompatibleSets,
  scenario,
  sequencesCompatible,
  toSelectionOptions,
  validateGameState,
  type SequenceCandidate,
} from "../src/index.js";
import { handCardId } from "./helpers.js";

function cand(
  teamId: string,
  cells: [string, string, string, string, string],
  direction: SequenceCandidate["direction"] = "HORIZONTAL",
): SequenceCandidate {
  return { teamId, cells, direction };
}

describe("sequence compatibility (§56, §109)", () => {
  it("sequences sharing zero or one cell are compatible", () => {
    const a = cand("t", ["r5c1", "r5c2", "r5c3", "r5c4", "r5c5"]);
    const disjoint = cand("t", ["r7c1", "r7c2", "r7c3", "r7c4", "r7c5"]);
    const sharedOne = cand(
      "t",
      ["r5c5", "r6c5", "r7c5", "r8c5", "r9c5"],
      "VERTICAL",
    );
    expect(sequencesCompatible(a, disjoint)).toBe(true);
    expect(sequencesCompatible(a, sharedOne)).toBe(true);
  });

  it("sequences sharing two cells are incompatible", () => {
    const a = cand("t", ["r5c1", "r5c2", "r5c3", "r5c4", "r5c5"]);
    const b = cand("t", ["r5c4", "r5c5", "r5c6", "r5c7", "r5c8"]);
    expect(sequencesCompatible(a, b)).toBe(false);
  });
});

describe("maximum compatible set resolution (§64–§66, §110)", () => {
  it("returns both single-window options for a 6-run (§63)", () => {
    const candidates = [
      cand("t", ["r5c1", "r5c2", "r5c3", "r5c4", "r5c5"]),
      cand("t", ["r5c2", "r5c3", "r5c4", "r5c5", "r5c6"]),
    ];
    const sets = findMaximumCompatibleSets(candidates, []);
    // Max size is 1; two distinct maximum sets.
    expect(sets).toHaveLength(2);
    expect(sets.every((s) => s.length === 1)).toBe(true);
  });

  it("scores the maximum number of sequences for a 9-run (§125)", () => {
    const candidates = [
      cand("t", ["r5c1", "r5c2", "r5c3", "r5c4", "r5c5"]),
      cand("t", ["r5c2", "r5c3", "r5c4", "r5c5", "r5c6"]),
      cand("t", ["r5c3", "r5c4", "r5c5", "r5c6", "r5c7"]),
      cand("t", ["r5c4", "r5c5", "r5c6", "r5c7", "r5c8"]),
      cand("t", ["r5c5", "r5c6", "r5c7", "r5c8", "r5c9"]),
    ];
    const sets = findMaximumCompatibleSets(candidates, []);
    // The unique maximum set is {1–5, 5–9}.
    expect(sets).toHaveLength(1);
    expect(sets[0]).toHaveLength(2);
  });

  it("drops candidates incompatible with existing sequences (§56)", () => {
    const existing = [
      {
        id: "S1",
        teamId: "t",
        cells: ["r5c1", "r5c2", "r5c3", "r5c4", "r5c5"] as const,
        direction: "HORIZONTAL" as const,
        createdTurn: 1,
        createdByActionId: "x",
      },
    ];
    // Overlaps the existing sequence by 4 cells → never claimable.
    const overlapping = cand("t", ["r5c2", "r5c3", "r5c4", "r5c5", "r5c6"]);
    const compatible = cand("t", ["r5c5", "r6c5", "r7c5", "r8c5", "r9c5"], "VERTICAL");
    const filtered = filterClaimableCandidates(
      [overlapping, compatible],
      existing,
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toEqual(compatible);
  });

  it("never re-scores a duplicate of an existing sequence (§54)", () => {
    const existing = [
      {
        id: "S1",
        teamId: "t",
        cells: ["r5c1", "r5c2", "r5c3", "r5c4", "r5c5"] as const,
        direction: "HORIZONTAL" as const,
        createdTurn: 1,
        createdByActionId: "x",
      },
    ];
    const duplicate = cand("t", ["r5c5", "r5c4", "r5c3", "r5c2", "r5c1"]);
    expect(
      filterClaimableCandidates([duplicate], existing),
    ).toHaveLength(0);
  });
});

describe("sequence selection tie-break (§68)", () => {
  it("chooses the lexicographically smallest canonical serialisation", () => {
    const options = toSelectionOptions([
      [cand("t", ["r5c2", "r5c3", "r5c4", "r5c5", "r5c6"])],
      [cand("t", ["r5c1", "r5c2", "r5c3", "r5c4", "r5c5"])],
    ]);
    const chosen = defaultSequenceOption(options);
    expect(chosen.optionId).toBe(
      [...options].map((o) => o.optionId).sort()[0],
    );
    // Deterministic: same result every call.
    expect(defaultSequenceOption(options)).toEqual(chosen);
  });
});

describe("incremental long-run behaviour (§56: 6-chip row ≠ 2)", () => {
  it("a 6th marker after a registered five creates no second sequence", () => {
    // Team [A,B] vs [C,D] so teammates alternate turns while extending the
    // same line.
    const state = scenario({ players: 4, teamSizes: [2, 2] })
      .withCurrentPlayer("A")
      .withHand("A", ["JC"])
      .withHand("C", ["2C"])
      .withHand("B", ["JD"])
      .withHand("D", ["3C"])
      .withMarker("A", 5, 1)
      .withMarker("A", 5, 2)
      .withMarker("A", 5, 3)
      .withMarker("A", 5, 4)
      .build();

    // A completes [1–5].
    const first = applyCommand(state, {
      type: "PLAY_WILD_JACK",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "JC"),
      targetCellId: "r5c5",
    });
    expect(first.state.completedSequences["team-1"]).toHaveLength(1);

    // C plays elsewhere.
    const afterC = applyCommand(first.state, {
      type: "PLAY_NORMAL_CARD",
      playerId: "p-C",
      actionId: "a2",
      cardId: handCardId(first.state, "p-C", "2C"),
      targetCellId: first.state.boardDefinition.cells.find(
        (c) => c.type === "CARD" && c.cardCode === "2C",
      )!.id,
    });

    // B (teammate) extends the row with a 6th marker → no new sequence.
    const afterB = applyCommand(afterC.state, {
      type: "PLAY_WILD_JACK",
      playerId: "p-B",
      actionId: "a3",
      cardId: handCardId(afterC.state, "p-B", "JD"),
      targetCellId: "r5c6",
    });
    expect(afterB.state.completedSequences["team-1"]).toHaveLength(1);
    expect(validateGameState(afterB.state)).toEqual([]);
  });
});
