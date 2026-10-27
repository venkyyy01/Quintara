/**
 * Domain events emitted by the engine (§82 DOMAIN EVENTS).
 *
 * Event ordering is deterministic (§152–§156) and events carry enough
 * deterministic information for replay (§102).
 *
 * Privacy: events may reference hidden card identities. The server must
 * project events per viewer before broadcasting (§23, §131) — see
 * projection.ts `projectEventsForViewer`.
 */

import type { CardCode, CardId } from "./cards.js";
import type { CellId } from "./board.js";
import type {
  ActionId,
  GameResultType,
  GameState,
  PlayerId,
  SequenceDirection,
  SequenceId,
  TeamId,
} from "./state.js";

export type DrawReason =
  | "TURN_REFILL"
  | "DEAD_CARD_REPLACEMENT";

export interface SequenceCompletedPayload {
  readonly sequenceId: SequenceId;
  readonly teamId: TeamId;
  readonly cells: readonly [CellId, CellId, CellId, CellId, CellId];
  readonly direction: SequenceDirection;
}

export type DomainEvent =
  | {
      readonly type: "GAME_STARTED";
      readonly gameId: string;
      readonly startingPlayerId: PlayerId;
      readonly startingSeat: number;
    }
  | {
      readonly type: "TURN_STARTED";
      readonly playerId: PlayerId;
      readonly teamId: TeamId;
      readonly turnNumber: number;
    }
  | {
      readonly type: "DEAD_CARD_EXCHANGED";
      readonly playerId: PlayerId;
      readonly cardId: CardId;
      readonly cardCode: CardCode;
    }
  | {
      readonly type: "CARD_PLAYED";
      readonly playerId: PlayerId;
      readonly cardId: CardId;
      readonly cardCode: CardCode;
    }
  | {
      readonly type: "MARKER_PLACED";
      readonly playerId: PlayerId;
      readonly teamId: TeamId;
      readonly cellId: CellId;
    }
  | {
      readonly type: "MARKER_REMOVED";
      readonly playerId: PlayerId;
      readonly removedTeamId: TeamId;
      readonly removedPlayerId: PlayerId;
      readonly cellId: CellId;
    }
  | {
      readonly type: "SEQUENCE_SELECTION_REQUIRED";
      readonly playerId: PlayerId;
      readonly teamId: TeamId;
      readonly optionCount: number;
    }
  | { readonly type: "SEQUENCE_COMPLETED" } & SequenceCompletedPayload
  | {
      readonly type: "CARD_DRAWN";
      readonly playerId: PlayerId;
      readonly cardId: CardId;
      readonly cardCode: CardCode;
      readonly reason: DrawReason;
    }
  | {
      readonly type: "DECK_RESHUFFLED";
      readonly discardedCount: number;
    }
  | {
      readonly type: "TURN_SKIPPED_NO_LEGAL_ACTION";
      readonly playerId: PlayerId;
      readonly turnNumber: number;
    }
  | {
      readonly type: "TURN_COMPLETED";
      readonly playerId: PlayerId;
      readonly turnNumber: number;
    }
  | {
      readonly type: "GAME_WON";
      readonly winnerTeamId: TeamId;
      readonly winningPlayerId: PlayerId;
      readonly winningActionId: ActionId;
      readonly totalTurns: number;
    }
  | {
      readonly type: "GAME_STALEMATED";
      readonly totalTurns: number;
    }
  | {
      readonly type: "GAME_DRAWN";
      readonly resultType: GameResultType;
    };

/** Result of any state transition: new immutable state + deterministic events. */
export interface EngineResult {
  readonly state: GameState;
  readonly events: readonly DomainEvent[];
}
