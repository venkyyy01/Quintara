/**
 * Sequence overlap rules and maximum-compatible-set resolution
 * (§56–§59, §63–§68, §109–§110).
 *
 * Same-team counted sequences may share at most one board coordinate.
 * After a placement, the engine scores the MAXIMUM number of valid new
 * sequences; ambiguity between equal maximum sets is resolved by the player
 * (§64–§66), with a deterministic lexicographic tie-break on timeout (§68).
 */

import {
  candidateKey,
  intersectionSize,
  optionKey,
} from "./sequences.js";
import type {
  CompletedSequence,
  SequenceCandidate,
  SequenceSelectionOption,
} from "./state.js";

/** §109 OVERLAP VALIDATOR: intersection size ≤ 1. */
export function sequencesCompatible(
  a: SequenceCandidate | CompletedSequence,
  b: SequenceCandidate | CompletedSequence,
): boolean {
  return intersectionSize(a.cells, b.cells) <= 1;
}

/**
 * Filters candidates that can never be claimed: duplicates of an existing
 * sequence (§54) or incompatible with an existing same-team sequence (§56).
 */
export function filterClaimableCandidates(
  candidates: readonly SequenceCandidate[],
  existingForTeam: readonly CompletedSequence[],
): SequenceCandidate[] {
  const existingKeys = new Set(existingForTeam.map((s) => candidateKey(s as SequenceCandidate)));
  return candidates.filter((candidate) => {
    if (existingKeys.has(candidateKey(candidate))) return false;
    return existingForTeam.every((existing) =>
      sequencesCompatible(candidate, existing),
    );
  });
}

/**
 * §64 QUINTARA SEQUENCE CLAIM RULE + §110 SEQUENCE SET RESOLUTION:
 * find every maximum-cardinality pairwise-compatible subset of the
 * claimable candidates.
 *
 * This is a maximum-clique enumeration. A naive 2^n mask scan is
 * exponential in the number of candidates; a placement can produce up to 20
 * candidates, so branch-and-bound (Bron–Kerbosch with pivoting) is used
 * instead. It visits only maximal cliques, and pruning by the remaining
 * candidate count keeps the common case tiny.
 */
export function findMaximumCompatibleSets(
  candidates: readonly SequenceCandidate[],
  existingForTeam: readonly CompletedSequence[],
): SequenceCandidate[][] {
  const claimable = filterClaimableCandidates(candidates, existingForTeam);
  if (claimable.length === 0) return [[]];

  // Compatibility graph, indexed by claimable candidate.
  const neighbors: Set<number>[] = claimable.map(() => new Set<number>());
  for (let i = 0; i < claimable.length; i++) {
    for (let j = i + 1; j < claimable.length; j++) {
      if (
        sequencesCompatible(
          claimable[i] as SequenceCandidate,
          claimable[j] as SequenceCandidate,
        )
      ) {
        (neighbors[i] as Set<number>).add(j);
        (neighbors[j] as Set<number>).add(i);
      }
    }
  }

  const best: number[][] = [];
  let bestSize = 0;
  const seen = new Set<string>();

  const search = (
    chosen: readonly number[],
    possible: Set<number>,
    excluded: Set<number>,
  ): void => {
    if (possible.size === 0 && excluded.size === 0) {
      // A maximal clique. Keep it only if it is (so far) maximum.
      if (chosen.length < bestSize) return;
      const sorted = [...chosen].sort((a, b) => a - b);
      const key = sorted.join(",");
      if (chosen.length > bestSize) {
        bestSize = chosen.length;
        best.length = 0;
        seen.clear();
      }
      if (!seen.has(key)) {
        seen.add(key);
        best.push(sorted);
      }
      return;
    }

    // No extension of `chosen` can beat the best known set.
    if (chosen.length + possible.size < bestSize) return;

    // Pivot on the vertex covering the most remaining candidates; only its
    // non-neighbours can start a new maximal clique at this level.
    let pivot = -1;
    let pivotCoverage = -1;
    for (const vertex of [...possible, ...excluded]) {
      let coverage = 0;
      for (const neighbor of neighbors[vertex] as Set<number>) {
        if (possible.has(neighbor)) coverage++;
      }
      if (coverage > pivotCoverage) {
        pivot = vertex;
        pivotCoverage = coverage;
      }
    }
    const branches = [...possible].filter(
      (vertex) =>
        pivot < 0 || !(neighbors[pivot] as Set<number>).has(vertex),
    );

    for (const vertex of branches) {
      if (!possible.has(vertex)) continue;
      const adjacent = neighbors[vertex] as Set<number>;
      const nextPossible = new Set<number>();
      for (const other of possible) {
        if (adjacent.has(other)) nextPossible.add(other);
      }
      const nextExcluded = new Set<number>();
      for (const other of excluded) {
        if (adjacent.has(other)) nextExcluded.add(other);
      }
      search([...chosen, vertex], nextPossible, nextExcluded);
      possible.delete(vertex);
      excluded.add(vertex);
    }
  };

  search(
    [],
    new Set(claimable.map((_, index) => index)),
    new Set(),
  );

  const byKey = new Map<string, SequenceCandidate[]>();
  for (const indices of best) {
    const set = indices.map(
      (index) => claimable[index] as SequenceCandidate,
    );
    byKey.set(optionKey(set), set);
  }
  return [...byKey.entries()]
    .sort(([a], [b]) => compareStrings(a, b))
    .map(([, set]) => set);
}

/** Locale-independent string ordering (UTF-16 code units). */
export function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Converts maximum sets into player-facing selection options with stable ids
 * (§66). Sorted canonically so options are deterministic.
 */
export function toSelectionOptions(
  sets: readonly SequenceCandidate[][],
): SequenceSelectionOption[] {
  return sets
    .map((sequences) => ({
      optionId: optionKey(sequences),
      sequences: [...sequences].sort((a, b) =>
        compareStrings(candidateKey(a), candidateKey(b)),
      ),
    }))
    .sort((a, b) => compareStrings(a.optionId, b.optionId));
}

/**
 * §68 SEQUENCE SELECTION TIMEOUT tie-break: choose the lexicographically
 * smallest canonical serialisation. Deterministic — never RNG.
 */
export function defaultSequenceOption(
  options: readonly SequenceSelectionOption[],
): SequenceSelectionOption {
  if (options.length === 0) {
    throw new Error("No sequence selection options");
  }
  return options.reduce((best, option) =>
    compareStrings(option.optionId, best.optionId) < 0 ? option : best,
  );
}
