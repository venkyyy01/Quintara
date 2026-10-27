/**
 * Legal action shapes (§43 MAIN ACTION TYPES, §107 LEGAL ACTION PSEUDOCODE).
 *
 * getLegalActions is the single source of truth for server validation, UI
 * highlighting, AI, tutorials and timeout auto-play (§42). Never
 * re-implement target legality elsewhere.
 */

import type { CellId } from "./board.js";
import type { CardId } from "./cards.js";
import type { SequenceSelectionOption } from "./state.js";

export interface PlayNormalCardAction {
  readonly type: "PLAY_NORMAL_CARD";
  readonly cardId: CardId;
  readonly targetCellId: CellId;
}

export interface PlayWildJackAction {
  readonly type: "PLAY_WILD_JACK";
  readonly cardId: CardId;
  readonly targetCellId: CellId;
}

export interface PlayRemoveJackAction {
  readonly type: "PLAY_REMOVE_JACK";
  readonly cardId: CardId;
  readonly targetCellId: CellId;
}

export type MainAction =
  | PlayNormalCardAction
  | PlayWildJackAction
  | PlayRemoveJackAction;

export interface ExchangeDeadCardAction {
  readonly type: "EXCHANGE_DEAD_CARD";
  readonly cardId: CardId;
}

export interface LegalActions {
  /** Pre-action: at most one per turn (§44). */
  readonly deadExchanges: readonly ExchangeDeadCardAction[];
  readonly mainActions: readonly MainAction[];
  /**
   * Present only during AWAITING_SEQUENCE_SELECTION: the valid maximum
   * sequence sets the acting player may claim (§66–§67).
   */
  readonly sequenceSelectionOptions?: readonly SequenceSelectionOption[];
}
