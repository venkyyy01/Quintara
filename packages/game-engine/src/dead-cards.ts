/**
 * Dead-card rules (§26–§30).
 *
 * A normal non-Jack card is dead when both of its board cells are occupied
 * by markers (ownership irrelevant). Deadness is always derived from the
 * current board — never stored on the card (§28). Jacks are never dead (§41).
 */

import { isJackCode, type Card } from "./cards.js";
import { cardCellsForCode } from "./board.js";
import type { GameState } from "./state.js";

/**
 * §27 DEAD CARD ALGORITHM:
 *  - Jack → false
 *  - both mapped board cells contain markers → true
 *  - otherwise → false
 */
export function isDeadCard(state: GameState, card: Card): boolean {
  if (isJackCode(card.code)) return false;
  const [a, b] = cardCellsForCode(state.boardDefinition, card.code);
  return isCellMarked(state, a) && isCellMarked(state, b);
}

function isCellMarked(state: GameState, cellId: string): boolean {
  return (state.board.cells[cellId]?.occupantTeamId ?? null) !== null;
}

/** Dead cards currently held by a player. */
export function deadCardsInHand(
  state: GameState,
  playerId: string,
): Card[] {
  const hand = state.hands[playerId] ?? [];
  return hand
    .map((cardId) => state.cards[cardId])
    .filter((c): c is Card => c !== undefined)
    .filter((c) => isDeadCard(state, c));
}

/**
 * Whether the player may perform their one dead-card exchange this turn
 * (§25, §29: at most one per turn, before the main action).
 */
export function canExchangeDeadCard(state: GameState, playerId: string): boolean {
  if (state.status !== "ACTIVE") return false;
  if (state.turnPhase !== "AWAITING_MAIN_ACTION") return false;
  if (state.turnOrder[state.currentTurnIndex] !== playerId) return false;
  if (state.deadCardExchangeUsed) return false;
  if (!state.rulesConfig.allowDeadCardExchange) return false;
  return deadCardsInHand(state, playerId).length > 0;
}
