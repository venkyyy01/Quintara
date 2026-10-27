/**
 * Quintara game configuration.
 *
 * The board layout is data-driven configuration consumed by UI components
 * (Design Plan §4) — never hard-coded in components. The Standard preset is
 * immutable (§105, §161); Custom games may only override approved options
 * (§106).
 */

import {
  createStandardBoardDefinition,
  validateBoardDefinition,
  STANDARD_HAND_SIZE,
  type BoardDefinition,
} from "@quintara/game-engine";

/**
 * The fixed physical Quintara board (10 × 10, 4 wild corners, 48 identities
 * twice). Generated deterministically and validated at module load, so a bad
 * board prevents application startup (§15).
 */
export const BOARD_LAYOUT: BoardDefinition = (() => {
  const board = createStandardBoardDefinition();
  validateBoardDefinition(board);
  return board;
})();

/** Immutable Standard rules preset (§105). */
export const QUINTARA_STANDARD = {
  boardSize: 10,
  wildCorners: true,
  allowJacks: true,
  twoEyedJacks: ["JC", "JD"] as const,
  oneEyedJacks: ["JH", "JS"] as const,
  allowDeadCardExchange: true,
  maxDeadCardExchangesPerTurn: 1,
  autoDraw: true,
  protectCompletedSequences: true,
  maxSequencePairOverlap: 1,
  reshuffleDiscardsWhenDeckEmpty: true,
  voluntaryPass: false,
  sequenceRecognition: "AUTOMATIC",
} as const;

export { STANDARD_HAND_SIZE };

/** Approved custom-game options (§106). Dangerous variants are not offered. */
export interface CustomGameOverrides {
  readonly requiredSequences?: number;
  readonly turnDurationMs?: number | null;
  readonly teamSizes?: number[];
  readonly handSize?: number;
}

/** Turn timer presets (Design Plan §56). */
export const TURN_TIMER_PRESETS = {
  Off: null,
  "15 sec": 15_000,
  "30 sec": 30_000,
  "45 sec": 45_000,
  "60 sec": 60_000,
} as const;

export const APP_NAME = "QUINTARA";
export const TAGLINE = "Build the line. Break the plan. Own the board.";
export const RULES_VERSION = "quintara-standard-1.0.0";
