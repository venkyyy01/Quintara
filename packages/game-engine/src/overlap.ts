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
 * claimable candidates. Board scale is tiny — brute force is safe and
 * correct (§148).
 */
export function findMaximumCompatibleSets(
  candidates: readonly SequenceCandidate[],
  existingForTeam: readonly CompletedSequence[],
): SequenceCandidate[][] {
  const claimable = filterClaimableCandidates(candidates, existingForTeam);

  const best: SequenceCandidate[][] = [];
  let bestSize = -1;

  const total = 1 << claimable.length; // claimable.length is small
  for (let mask = 0; mask < total; mask++) {
    const subset: SequenceCandidate[] = [];
    for (let i = 0; i < claimable.length; i++) {
      if (mask & (1 << i)) subset.push(claimable[i] as SequenceCandidate);
    }
    if (subset.length < bestSize) continue;
    if (!isPairwiseCompatible(subset)) continue;
    if (subset.length > bestSize) {
      bestSize = subset.length;
      best.length = 0;
    }
    best.push(subset);
  }

  // Deduplicate identical sets (same candidates in any order).
  const byKey = new Map<string, SequenceCandidate[]>();
  for (const set of best) {
    const key = optionKey(set);
    if (!byKey.has(key)) byKey.set(key, set);
  }
  return [...byKey.values()];
}

function isPairwiseCompatible(
  set: readonly SequenceCandidate[],
): boolean {
  for (let i = 0; i < set.length; i++) {
    for (let j = i + 1; j < set.length; j++) {
      if (!sequencesCompatible(set[i] as SequenceCandidate, set[j] as SequenceCandidate)) {
        return false;
      }
    }
  }
  return true;
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
        candidateKey(a).localeCompare(candidateKey(b)),
      ),
    }))
    .sort((a, b) => a.optionId.localeCompare(b.optionId));
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
    option.optionId < best.optionId ? option : best,
  );
}
