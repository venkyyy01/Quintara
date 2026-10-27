/**
 * Core game state model.
 *
 * Rule reference: Rules Contract §85 (GAME STATE MODEL), §86 (BOARD STATE),
 * §53 (SEQUENCE CANONICAL REPRESENTATION), §24 (TURN PHASES).
 *
 * State is plain JSON-serialisable data (no Map/Set in persisted structures,
 * §150) and transformations are immutable: commands return new states.
 */

import type {
  BoardCellDefinition,
  BoardDefinition,
  CellId,
} from "./board.js";
import type { Card, CardId } from "./cards.js";
import type { RngState } from "./rng.js";

export type GameId = string;
export type PlayerId = string;
export type TeamId = string;
export type SequenceId = string;
export type ActionId = string;

export const RULES_VERSION = "quintara-standard-1.0.0";

export type GameStatus = "LOBBY" | "ACTIVE" | "FINISHED";

export type TurnPhase =
  | "TURN_START"
  | "AWAITING_MAIN_ACTION"
  | "AWAITING_SEQUENCE_SELECTION"
  | "RESOLVING"
  | "GAME_OVER";

export type GameResultType = "WIN" | "STALEMATE";

export type SequenceDirection =
  | "HORIZONTAL"
  | "VERTICAL"
  | "DIAGONAL_DOWN"
  | "DIAGONAL_UP";

export interface PlayerState {
  readonly id: PlayerId;
  readonly name: string;
  readonly seat: number;
  readonly teamId: TeamId;
}

export interface TeamState {
  readonly id: TeamId;
  readonly name: string;
  readonly memberIds: readonly PlayerId[];
}

export interface CellOccupancy {
  readonly occupantTeamId: TeamId | null;
  readonly occupantPlayerId: PlayerId | null;
}

export interface BoardState {
  readonly definitionId: string;
  /** Occupancy for CARD cells only. Wild corners are never occupied (§13). */
  readonly cells: Readonly<Record<CellId, CellOccupancy>>;
}

export interface CompletedSequence {
  readonly id: SequenceId;
  readonly teamId: TeamId;
  readonly cells: readonly [CellId, CellId, CellId, CellId, CellId];
  readonly direction: SequenceDirection;
  readonly createdTurn: number;
  readonly createdByActionId: ActionId;
}

/** A claimable new sequence candidate (pre-registration form). */
export interface SequenceCandidate {
  readonly teamId: TeamId;
  readonly cells: readonly [CellId, CellId, CellId, CellId, CellId];
  readonly direction: SequenceDirection;
}

export interface SequenceSelectionOption {
  readonly optionId: string;
  readonly sequences: readonly SequenceCandidate[];
}

/**
 * Per-match rules configuration (§104 CONFIGURATION).
 * Invariant rules are not configurable; only product options live here.
 */
export interface GameRulesConfig {
  readonly handSize: number;
  readonly allowDeadCardExchange: boolean;
  readonly maxDeadCardExchangesPerTurn: number;
  readonly turnDurationMs: number | null;
}

export interface GameState {
  readonly id: GameId;
  readonly rulesVersion: string;
  readonly rulesConfig: GameRulesConfig;

  readonly status: GameStatus;
  readonly resultType: GameResultType | null;

  readonly players: readonly PlayerState[];
  readonly teams: readonly TeamState[];

  readonly board: BoardState;
  /** Immutable board configuration carried for self-contained replay (§102). */
  readonly boardDefinition: BoardDefinition;
  /** Immutable physical card catalog keyed by card id. */
  readonly cards: Readonly<Record<CardId, Card>>;

  readonly turnOrder: readonly PlayerId[];
  readonly startingSeat: number;
  readonly currentTurnIndex: number;
  readonly turnNumber: number;
  readonly turnPhase: TurnPhase;

  readonly drawPile: readonly CardId[];
  readonly hands: Readonly<Record<PlayerId, readonly CardId[]>>;
  readonly discardPiles: Readonly<Record<PlayerId, readonly CardId[]>>;

  readonly completedSequences: Readonly<
    Record<TeamId, readonly CompletedSequence[]>
  >;
  /** Membership index for protection (§70). CARD cells only. */
  readonly sequenceMembership: Readonly<Record<CellId, readonly SequenceId[]>>;
  readonly sequenceCounter: number;

  readonly deadCardExchangeUsed: boolean;
  readonly pendingSequenceOptions: readonly SequenceSelectionOption[] | null;

  readonly requiredSequences: number;
  readonly winnerTeamId: TeamId | null;

  readonly version: number;

  readonly rng: RngState;
  readonly rngVersion: string;

  /** Stalemate safeguard bookkeeping (§167). */
  readonly consecutiveNoActionSkips: number;

  readonly createdAt: string;
  readonly finishedAt: string | null;
}

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

export function getPlayer(
  state: GameState,
  playerId: PlayerId,
): PlayerState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Unknown player ${playerId}`);
  }
  return player;
}

export function getTeamOfPlayer(
  state: GameState,
  playerId: PlayerId,
): TeamState {
  const player = getPlayer(state, playerId);
  return getTeam(state, player.teamId);
}

export function getTeam(state: GameState, teamId: TeamId): TeamState {
  const team = state.teams.find((t) => t.id === teamId);
  if (!team) {
    throw new Error(`Unknown team ${teamId}`);
  }
  return team;
}

export function currentPlayerId(state: GameState): PlayerId | null {
  if (state.status !== "ACTIVE") return null;
  return state.turnOrder[state.currentTurnIndex] ?? null;
}

export function currentPlayerTeamId(state: GameState): TeamId | null {
  const playerId = currentPlayerId(state);
  return playerId === null ? null : getPlayer(state, playerId).teamId;
}

export function getOccupancy(
  state: GameState,
  id: CellId,
): CellOccupancy | null {
  return state.board.cells[id] ?? null;
}

export function isCellOccupied(state: GameState, id: CellId): boolean {
  return (state.board.cells[id]?.occupantTeamId ?? null) !== null;
}

export function getCellDef(
  state: GameState,
  id: CellId,
): BoardCellDefinition {
  const cell = state.boardDefinition.cells.find((c) => c.id === id);
  if (!cell) throw new Error(`Unknown cell ${id}`);
  return cell;
}

export function isProtectedCell(state: GameState, id: CellId): boolean {
  return (state.sequenceMembership[id]?.length ?? 0) > 0;
}

export function countCompletedSequences(
  state: GameState,
  teamId: TeamId,
): number {
  return state.completedSequences[teamId]?.length ?? 0;
}
