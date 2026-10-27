/**
 * Heuristic evaluation for Medium+ bots (Design Plan §22 suggested weights,
 * tuned within the engine's rules).
 */

import {
  detectCandidateSequences,
  findMaximumCompatibleSets,
  getPlayer,
  isProtectedCell,
  type GameState,
  type MainAction,
  type PlayerId,
} from "@quintara/game-engine";

/** Design Plan §22 suggested evaluation weights. */
export const HEURISTIC_WEIGHTS = {
  immediateVictory: 100_000,
  preventOpponentVictory: 90_000,
  completeOwnFour: 20_000,
  blockOpponentFour: 18_000,
  createDoubleThreat: 12_000,
  buildOpenFour: 7_000,
  blockStrongIntersection: 6_000,
  createOpenThree: 2_500,
  highConnectivityCell: 1_000,
  wasteTwoEyedJack: -1_500,
  wasteOneEyedJack: -1_800,
} as const;

export interface EvaluationInput {
  readonly state: GameState;
  readonly playerId: PlayerId;
}

export function teamOf(state: GameState, playerId: PlayerId): string {
  return getPlayer(state, playerId).teamId;
}

/** Number of directions in which a cell extends the team's lines. */
export function connectivity(state: GameState, cellId: string): number {
  const cell = state.boardDefinition.cells.find((c) => c.id === cellId);
  if (!cell) return 0;
  return (
    state.boardDefinition.cells.filter(
      (c) =>
        c.id !== cellId &&
        Math.abs(c.row - cell.row) <= 1 &&
        Math.abs(c.column - cell.column) <= 1,
    ).length
  );
}

/**
 * Counts immediate winning completions for a team if it could place at a
 * cell — i.e. how many candidate sequences a placement would add.
 */
export function threatLevel(
  state: GameState,
  teamId: string,
  cellId: string,
): number {
  const candidates = detectCandidateSequences(state, teamId, cellId);
  const existing = state.completedSequences[teamId] ?? [];
  const sets = findMaximumCompatibleSets(candidates, existing);
  return sets[0]?.length ?? 0;
}

/** Whether a cell is part of any completed (protected) sequence. */
export function isStrongIntersection(
  state: GameState,
  cellId: string,
): boolean {
  return isProtectedCell(state, cellId);
}

/**
 * Scores a main action for the acting player's team. Purely positional —
 * uses only public board information and the bot's own identity (§91).
 */
export function scoreMainAction(
  input: EvaluationInput,
  action: MainAction,
): number {
  const { state, playerId } = input;
  const myTeam = teamOf(state, playerId);
  const weights = HEURISTIC_WEIGHTS;
  let score = 0;

  if (action.type === "PLAY_REMOVE_JACK") {
    const occupancy = state.board.cells[action.targetCellId];
    const removedTeam = occupancy?.occupantTeamId;
    // Removing a marker that completes an opponent threat is valuable.
    if (removedTeam && removedTeam !== myTeam) {
      const opponentThreat = threatLevel(
        state,
        removedTeam,
        action.targetCellId,
      );
      score += weights.blockOpponentFour * (1 + opponentThreat);
      score += connectivity(state, action.targetCellId);
    } else {
      score += weights.wasteOneEyedJack;
    }
    return score;
  }

  // Placement actions: evaluate resulting threats for both sides.
  const target = action.targetCellId;
  const myThreat = threatLevel(state, myTeam, target);
  if (myThreat > 0) {
    score +=
      myThreat >= (state.requiredSequences - countTeamSequences(state, myTeam))
        ? weights.immediateVictory
        : weights.completeOwnFour * myThreat;
  }

  // Double threat: two separate windows created by one placement.
  const candidates = detectCandidateSequences(state, myTeam, target);
  if (candidates.length >= 2) {
    score += weights.createDoubleThreat;
    score += weights.buildOpenFour;
  } else if (candidates.length === 1) {
    score += weights.createOpenThree;
  }

  // Blocking: would this cell win for an opponent right now?
  for (const team of state.teams) {
    if (team.id === myTeam) continue;
    const opponentThreat = threatLevel(state, team.id, target);
    if (opponentThreat > 0) {
      const opponentNeeds =
        state.requiredSequences - countTeamSequences(state, team.id);
      score +=
        opponentThreat >= opponentNeeds
          ? weights.preventOpponentVictory
          : weights.blockOpponentFour * opponentThreat;
    }
  }

  // Positional value.
  score += weights.highConnectivityCell * (connectivity(state, target) / 8);

  if (action.type === "PLAY_WILD_JACK" && myThreat === 0) {
    // Conserving Two-Eyed Jacks for real threats (§22).
    score += weights.wasteTwoEyedJack;
  }

  return score;
}

function countTeamSequences(state: GameState, teamId: string): number {
  return state.completedSequences[teamId]?.length ?? 0;
}
