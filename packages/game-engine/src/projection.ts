/**
 * Viewer-specific state projection (§32, §88–§90, §23).
 *
 * Never return the raw authoritative GameState to clients. Opponent hands
 * become counts only — hidden information is omitted from the payload, not
 * hidden with CSS (§8, §23). Events are projected per viewer too (§131).
 */

import type { BoardCellDefinition, BoardDefinition, CellId } from "./board.js";
import type { Card, CardCode, CardId } from "./cards.js";
import type { LegalActions } from "./actions.js";
import type { DomainEvent } from "./events.js";
import { isDeadCard } from "./dead-cards.js";
import { getLegalActions } from "./legal-actions.js";
import {
  currentPlayerId,
  type CompletedSequence,
  type GameResultType,
  type GameRulesConfig,
  type GameState,
  type PlayerId,
  type SequenceSelectionOption,
  type TeamId,
} from "./state.js";

export interface ViewerPlayerInfo {
  readonly id: PlayerId;
  readonly name: string;
  readonly seat: number;
  readonly teamId: TeamId;
  readonly teamName: string;
  readonly cardCount: number;
  readonly isCurrentPlayer: boolean;
}

export interface ViewerTeamInfo {
  readonly id: TeamId;
  readonly name: string;
  readonly memberIds: readonly PlayerId[];
  readonly sequenceCount: number;
}

export interface ViewerCardInfo {
  readonly id: CardId;
  readonly code: CardCode;
  readonly rank: string;
  readonly suit: string;
  /** Both board copies are occupied, so the card cannot be played. */
  readonly dead: boolean;
}

export interface ProjectedState {
  readonly id: string;
  readonly rulesVersion: string;
  readonly rulesConfig: GameRulesConfig;
  readonly status: GameState["status"];
  readonly resultType: GameResultType | null;
  readonly winnerTeamId: TeamId | null;

  readonly players: readonly ViewerPlayerInfo[];
  readonly teams: readonly ViewerTeamInfo[];

  readonly boardDefinition: BoardDefinition;
  readonly boardCells: Readonly<Record<CellId, { occupantTeamId: TeamId | null; occupantPlayerId: PlayerId | null }>>;

  readonly completedSequences: Readonly<Record<TeamId, readonly CompletedSequence[]>>;
  readonly sequenceMembership: Readonly<Record<CellId, readonly string[]>>;

  readonly turnOrder: readonly PlayerId[];
  readonly currentTurnPlayerId: PlayerId | null;
  readonly turnNumber: number;
  readonly turnPhase: GameState["turnPhase"];
  readonly deadCardExchangeUsed: boolean;

  readonly requiredSequences: number;
  readonly drawPileCount: number;
  /** Discards are public (§45). */
  readonly discardPiles: Readonly<Record<PlayerId, readonly CardCode[]>>;

  /** Viewer's own hand only. null for spectators. */
  readonly hand: readonly ViewerCardInfo[] | null;
  readonly handCounts: Readonly<Record<PlayerId, number>>;

  readonly pendingSequenceOptions: readonly SequenceSelectionOption[] | null;

  readonly version: number;
  readonly createdAt: string;
  readonly finishedAt: string | null;

  /** Legal actions for the viewer when it is their turn (§140). */
  readonly legalActions: LegalActions | null;
}

export type ProjectedEvent =
  | DomainEvent
  | {
      readonly type: "CARD_DRAWN";
      readonly playerId: PlayerId;
      readonly hidden: true;
    };

/**
 * Projects the authoritative state for one viewer (§88).
 * `viewerId` null projects for a spectator (§163: spectators never see hands).
 */
export function projectStateForViewer(
  state: GameState,
  viewerId: PlayerId | null,
): ProjectedState {
  const activePlayerId = currentPlayerId(state);

  const players: ViewerPlayerInfo[] = state.players.map((player) => {
    const team = state.teams.find((t) => t.id === player.teamId);
    return {
      id: player.id,
      name: player.name,
      seat: player.seat,
      teamId: player.teamId,
      teamName: team?.name ?? "",
      cardCount: (state.hands[player.id] ?? []).length,
      isCurrentPlayer: player.id === activePlayerId,
    };
  });

  const teams: ViewerTeamInfo[] = state.teams.map((team) => ({
    id: team.id,
    name: team.name,
    memberIds: team.memberIds,
    sequenceCount: state.completedSequences[team.id]?.length ?? 0,
  }));

  const handCounts: Record<PlayerId, number> = {};
  for (const player of state.players) {
    handCounts[player.id] = (state.hands[player.id] ?? []).length;
  }

  const discardPiles: Record<PlayerId, CardCode[]> = {};
  for (const player of state.players) {
    discardPiles[player.id] = (state.discardPiles[player.id] ?? [])
      .map((cardId) => state.cards[cardId]?.code ?? "")
      .filter((code) => code !== "");
  }

  let hand: ViewerCardInfo[] | null = null;
  if (viewerId !== null && state.hands[viewerId] !== undefined) {
    hand = (state.hands[viewerId] ?? []).map((cardId) => {
      const card = state.cards[cardId] as Card;
      return {
        id: card.id,
        code: card.code,
        rank: card.rank,
        suit: card.suit,
        dead: isDeadCard(state, card),
      };
    });
  }

  let legalActions: LegalActions | null = null;
  if (
    viewerId !== null &&
    state.status === "ACTIVE" &&
    activePlayerId === viewerId
  ) {
    legalActions = getLegalActions(state, viewerId);
  }

  return {
    id: state.id,
    rulesVersion: state.rulesVersion,
    rulesConfig: state.rulesConfig,
    status: state.status,
    resultType: state.resultType,
    winnerTeamId: state.winnerTeamId,
    players,
    teams,
    boardDefinition: state.boardDefinition,
    boardCells: state.board.cells,
    completedSequences: state.completedSequences,
    sequenceMembership: state.sequenceMembership,
    turnOrder: state.turnOrder,
    currentTurnPlayerId: activePlayerId,
    turnNumber: state.turnNumber,
    turnPhase: state.turnPhase,
    deadCardExchangeUsed: state.deadCardExchangeUsed,
    requiredSequences: state.requiredSequences,
    drawPileCount: state.drawPile.length,
    discardPiles,
    hand,
    handCounts,
    pendingSequenceOptions: state.pendingSequenceOptions,
    version: state.version,
    createdAt: state.createdAt,
    finishedAt: state.finishedAt,
    legalActions,
  };
}

/**
 * Redacts hidden card identities from events before broadcasting (§131).
 * Only CARD_DRAWN is private: the drawn card is known solely to the drawer.
 * PLAYED and EXCHANGED cards become public discard information (§45).
 */
export function projectEventsForViewer(
  events: readonly DomainEvent[],
  viewerId: PlayerId | null,
): ProjectedEvent[] {
  return events.map((event) => {
    if (event.type === "CARD_DRAWN") {
      const visible = viewerId !== null && event.playerId === viewerId;
      if (!visible) {
        return {
          type: "CARD_DRAWN" as const,
          playerId: event.playerId,
          hidden: true as const,
        };
      }
    }
    return event;
  });
}

/** Board cell definitions are public configuration (§89). */
export type PublicCellDefinition = BoardCellDefinition;
