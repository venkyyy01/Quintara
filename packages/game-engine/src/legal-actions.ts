/**
 * Legal action generation (§42, §107).
 *
 * The authoritative engine exposes getLegalActions as the source of truth
 * for server validation, UI highlighting, AI, tutorials, timeout auto-play
 * and tests.
 */

import { cardCellsForCode, type CellId } from "./board.js";
import { getCard, isJackCode, type Card } from "./cards.js";
import { deadCardsInHand } from "./dead-cards.js";
import {
  getRemovalJackLegalTargets,
  getWildJackLegalTargets,
  isOneEyedJack,
  isTwoEyedJack,
} from "./jacks.js";
import type {
  ExchangeDeadCardAction,
  LegalActions,
  MainAction,
} from "./actions.js";
import { EngineError } from "./errors.js";
import {
  currentPlayerId,
  getPlayer,
  type GameState,
  type PlayerId,
} from "./state.js";

/**
 * Legal board targets for a normal card (§32): the card's two mapped cells,
 * filtered to unoccupied CARD cells. Result count: 2, 1 or 0.
 */
export function getNormalCardLegalTargets(
  state: GameState,
  card: Card,
): CellId[] {
  const [a, b] = cardCellsForCode(state.boardDefinition, card.code);
  return [a, b].filter((id) => {
    const occupancy = state.board.cells[id];
    return occupancy !== undefined && occupancy.occupantTeamId === null;
  });
}

export function getMainActions(
  state: GameState,
  playerId: PlayerId,
): MainAction[] {
  const teamId = getPlayer(state, playerId).teamId;

  const hand = state.hands[playerId] ?? [];
  const actions: MainAction[] = [];

  for (const cardId of hand) {
    const card = getCard(state.cards, cardId);

    if (!isJackCode(card.code)) {
      for (const targetCellId of getNormalCardLegalTargets(state, card)) {
        actions.push({ type: "PLAY_NORMAL_CARD", cardId, targetCellId });
      }
      continue;
    }

    if (isTwoEyedJack(card)) {
      for (const targetCellId of getWildJackLegalTargets(state)) {
        actions.push({ type: "PLAY_WILD_JACK", cardId, targetCellId });
      }
      continue;
    }

    if (isOneEyedJack(card)) {
      for (const targetCellId of getRemovalJackLegalTargets(state, teamId)) {
        actions.push({ type: "PLAY_REMOVE_JACK", cardId, targetCellId });
      }
    }
  }

  return actions;
}

export function getDeadExchangeActions(
  state: GameState,
  playerId: PlayerId,
): ExchangeDeadCardAction[] {
  if (state.deadCardExchangeUsed) return [];
  if (!state.rulesConfig.allowDeadCardExchange) return [];
  return deadCardsInHand(state, playerId).map((card) => ({
    type: "EXCHANGE_DEAD_CARD" as const,
    cardId: card.id,
  }));
}

/**
 * Full legal-action projection for a player on their turn (§107).
 * During AWAITING_SEQUENCE_SELECTION the only legal action is choosing a
 * sequence set, exposed via sequenceSelectionOptions.
 */
export function getLegalActions(
  state: GameState,
  playerId: PlayerId,
): LegalActions {
  if (state.status !== "ACTIVE") {
    throw new EngineError("GAME_NOT_ACTIVE");
  }
  const active = currentPlayerId(state);
  if (active !== playerId) {
    throw new EngineError("NOT_YOUR_TURN");
  }

  if (state.turnPhase === "AWAITING_SEQUENCE_SELECTION") {
    return {
      deadExchanges: [],
      mainActions: [],
      sequenceSelectionOptions: state.pendingSequenceOptions ?? [],
    };
  }

  if (state.turnPhase !== "AWAITING_MAIN_ACTION") {
    throw new EngineError("INVALID_PHASE");
  }

  return {
    deadExchanges: getDeadExchangeActions(state, playerId),
    mainActions: getMainActions(state, playerId),
  };
}
