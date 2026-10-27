/**
 * Victory evaluation and game completion (§73, §100–§101, §167).
 *
 * Victory is immediate when a team reaches requiredSequences — no later
 * player receives a response move and no replacement draw occurs (§47).
 */

import type { DomainEvent } from "./events.js";
import {
  countCompletedSequences,
  type ActionId,
  type GameState,
  type PlayerId,
  type TeamId,
} from "./state.js";

export function checkVictory(
  state: GameState,
  teamId: TeamId,
): boolean {
  return countCompletedSequences(state, teamId) >= state.requiredSequences;
}

export function finishGameWithWinner(
  state: GameState,
  teamId: TeamId,
  winningPlayerId: PlayerId,
  winningActionId: ActionId,
): { state: GameState; events: DomainEvent[] } {
  const finished: GameState = {
    ...state,
    status: "FINISHED",
    resultType: "WIN",
    turnPhase: "GAME_OVER",
    winnerTeamId: teamId,
    finishedAt: new Date().toISOString(),
    pendingSequenceOptions: null,
  };
  return {
    state: finished,
    events: [
      {
        type: "GAME_WON",
        winnerTeamId: teamId,
        winningPlayerId,
        winningActionId,
        totalTurns: state.turnNumber,
      },
    ],
  };
}

/**
 * §167 TERMINAL STALEMATE SAFEGUARD: a full rotation of consecutive
 * no-legal-action skips with no board change ends the game as STALEMATE.
 */
export function finishGameStalemate(
  state: GameState,
): { state: GameState; events: DomainEvent[] } {
  const finished: GameState = {
    ...state,
    status: "FINISHED",
    resultType: "STALEMATE",
    turnPhase: "GAME_OVER",
    winnerTeamId: null,
    finishedAt: new Date().toISOString(),
    pendingSequenceOptions: null,
  };
  return {
    state: finished,
    events: [{ type: "GAME_STALEMATED", totalTurns: state.turnNumber }],
  };
}
