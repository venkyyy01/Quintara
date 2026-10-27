/**
 * Jack rules (§18, §35–§41).
 *
 * Two-Eyed Jacks (J♣ J♦) place a marker on any empty normal cell.
 * One-Eyed Jacks (J♥ J♠) remove one eligible unprotected opponent marker.
 * Jacks never map to board identities and are never dead cards (§41).
 */

import {
  isOneEyedJackCode,
  isTwoEyedJackCode,
  jackKind,
  type Card,
} from "./cards.js";
import type { CellId } from "./board.js";
import {
  getPlayer,
  isProtectedCell,
  type GameState,
  type TeamId,
} from "./state.js";

export function isTwoEyedJack(card: Card): boolean {
  return isTwoEyedJackCode(card.code);
}

export function isOneEyedJack(card: Card): boolean {
  return isOneEyedJackCode(card.code);
}

export { jackKind };

/**
 * Legal targets for a Two-Eyed Jack (§35):
 * any unoccupied normal CARD cell. Wild corners are never targets.
 */
export function getWildJackLegalTargets(state: GameState): CellId[] {
  const targets: CellId[] = [];
  for (const cell of state.boardDefinition.cells) {
    if (cell.type !== "CARD") continue;
    const occupancy = state.board.cells[cell.id];
    if (occupancy && occupancy.occupantTeamId === null) {
      targets.push(cell.id);
    }
  }
  return targets;
}

/**
 * Legal targets for a One-Eyed Jack (§38):
 *  - CARD cell containing a marker
 *  - belongs to a competing team (never own team / teammates)
 *  - not part of any completed sequence (protected marker, §39)
 *
 * For three teams, either opposing team may be targeted.
 */
export function getRemovalJackLegalTargets(
  state: GameState,
  actingTeamId: TeamId,
): CellId[] {
  const targets: CellId[] = [];
  for (const cell of state.boardDefinition.cells) {
    if (cell.type !== "CARD") continue;
    const occupancy = state.board.cells[cell.id];
    if (!occupancy || occupancy.occupantTeamId === null) continue;
    if (occupancy.occupantTeamId === actingTeamId) continue;
    if (isProtectedCell(state, cell.id)) continue;
    targets.push(cell.id);
  }
  return targets;
}

/** Whether a specific One-Eyed Jack target is legal (validation reuse). */
export function isRemovableMarker(
  state: GameState,
  actingTeamId: TeamId,
  cellId: CellId,
): boolean {
  return getRemovalJackLegalTargets(state, actingTeamId).includes(cellId);
}

/** Human-readable summary used by tutorials/UI. */
export function describeJack(card: Card): string {
  switch (jackKind(card.code)) {
    case "TWO_EYED":
      return "Two-Eyed Jack: place a marker on any empty space.";
    case "ONE_EYED":
      return "One-Eyed Jack: remove one unprotected opponent marker.";
    default:
      return "";
  }
}

export function playerTeamOf(state: GameState, playerId: string): TeamId {
  return getPlayer(state, playerId).teamId;
}
