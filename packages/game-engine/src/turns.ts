/**
 * Turn state machine: completion, advancement, no-legal-action safeguard
 * and stalemate tracking (§24–§25, §75–§78, §152–§154, §167).
 */

import type { DomainEvent } from "./events.js";
import { getDeadExchangeActions, getMainActions } from "./legal-actions.js";
import {
  currentPlayerId,
  getPlayer,
  type GameState,
  type PlayerId,
} from "./state.js";
import { finishGameStalemate, wallClock, type Clock } from "./victory.js";

/** Marks a board mutation: resets the stalemate skip counter (§167). */
export function withBoardChange(state: GameState): GameState {
  return { ...state, consecutiveNoActionSkips: 0 };
}

/**
 * Ends the current player's turn (TURN_COMPLETED), advances to the next
 * player (TURN_STARTED) and enforces the no-legal-action safeguard loop.
 */
export function completeTurnAndAdvance(
  state: GameState,
  now: Clock = wallClock,
): {
  state: GameState;
  events: DomainEvent[];
} {
  const events: DomainEvent[] = [];
  const endingPlayerId = currentPlayerId(state);
  if (endingPlayerId !== null) {
    events.push({
      type: "TURN_COMPLETED",
      playerId: endingPlayerId,
      turnNumber: state.turnNumber,
    });
  }
  const current = advanceToNextPlayer(state);
  events.push(...turnStartedEvents(current));
  return enforceNoLegalActionSafeguard(current, events, now);
}

/**
 * Enforces §75 at turn start: if the current player has zero legal main
 * actions and cannot exchange a dead card, the engine emits
 * TURN_SKIPPED_NO_LEGAL_ACTION and advances. Never deadlocks (§75).
 *
 * §76: voluntary passing is never legal — only this safeguard skips turns.
 */
export function enforceNoLegalActionSafeguard(
  state: GameState,
  priorEvents: DomainEvent[] = [],
  now: Clock = wallClock,
): { state: GameState; events: DomainEvent[] } {
  const events = [...priorEvents];
  let current = state;

  // Safety bound: one full extra rotation plus margin; stalemate usually ends
  // the loop first.
  const maxIterations = current.turnOrder.length * 2 + 4;

  for (let i = 0; i < maxIterations; i++) {
    const playerId = currentPlayerId(current);
    if (playerId === null) return { state: current, events };
    if (current.status !== "ACTIVE") return { state: current, events };

    const mainActions = getMainActions(current, playerId);
    const exchanges = getDeadExchangeActions(current, playerId);
    if (mainActions.length > 0 || exchanges.length > 0) {
      return { state: current, events };
    }

    // §75: zero legal main actions and no exchange available → skip.
    events.push({
      type: "TURN_SKIPPED_NO_LEGAL_ACTION",
      playerId,
      turnNumber: current.turnNumber,
    });
    const skips = current.consecutiveNoActionSkips + 1;
    current = { ...current, consecutiveNoActionSkips: skips };

    if (skips >= current.turnOrder.length) {
      const result = finishGameStalemate(current, now);
      return { state: result.state, events: [...events, ...result.events] };
    }

    current = advanceToNextPlayer(current);
    events.push(...turnStartedEvents(current));
  }

  return { state: current, events };
}

/**
 * Emits TURN_STARTED for the current player and runs the turn-start
 * safeguard. Used by startGame for the first turn and after main actions.
 */
export function startTurnsWithSafeguard(
  state: GameState,
  now: Clock = wallClock,
): {
  state: GameState;
  events: DomainEvent[];
} {
  return enforceNoLegalActionSafeguard(state, turnStartedEvents(state), now);
}

function advanceToNextPlayer(state: GameState): GameState {
  const nextIndex =
    state.turnOrder.length === 0
      ? 0
      : (state.currentTurnIndex + 1) % state.turnOrder.length;
  return {
    ...state,
    currentTurnIndex: nextIndex,
    turnNumber: state.turnNumber + 1,
    turnPhase: "AWAITING_MAIN_ACTION",
    deadCardExchangeUsed: false,
    pendingSequenceOptions: null,
  };
}

function turnStartedEvents(state: GameState): DomainEvent[] {
  const playerId: PlayerId | null = currentPlayerId(state);
  if (playerId === null || state.status !== "ACTIVE") return [];
  return [
    {
      type: "TURN_STARTED",
      playerId,
      teamId: getPlayer(state, playerId).teamId,
      turnNumber: state.turnNumber,
    },
  ];
}
