/**
 * Game configuration and setup: player counts, team configurations,
 * hand sizes, turn order generation, createGame / startGame.
 *
 * Rule reference: Rules Contract §3–§8 (WIN REQUIREMENT, VALID STANDARD
 * PLAYER COUNTS, INDIVIDUAL VS TEAM PLAY, STANDARD TEAM CONFIGURATIONS,
 * TEAM TURN ORDER, HAND SIZE), §21–§22 (DEALING, STARTING PLAYER),
 * Game Design Plan §6.
 */

import {
  createStandardBoardDefinition,
  type BoardDefinition,
} from "./board.js";
import { createStandardDeck, type Card, type CardId } from "./cards.js";
import { EngineError } from "./errors.js";
import {
  createRngState,
  pickUniform,
  shuffled,
  RNG_ALGORITHM_VERSION,
  type RngState,
} from "./rng.js";
import type { EngineResult } from "./events.js";
import { startTurnsWithSafeguard } from "./turns.js";
import { wallClock, type Clock } from "./victory.js";
import {
  RULES_VERSION,
  type GameRulesConfig,
  type GameState,
  type PlayerId,
  type PlayerState,
  type TeamId,
  type TeamState,
} from "./state.js";

/** Immutable Standard hand-size table (§8). Do not infer formulaically. */
export const STANDARD_HAND_SIZE: Readonly<Record<number, number>> = {
  2: 7,
  3: 6,
  4: 6,
  6: 5,
  8: 4,
  9: 4,
  10: 3,
  12: 3,
};

/** Standard mode accepts exactly these player counts (§4). */
export const STANDARD_PLAYER_COUNTS: readonly number[] = [
  2, 3, 4, 6, 8, 9, 10, 12,
];

export function isStandardPlayerCount(count: number): boolean {
  return STANDARD_PLAYER_COUNTS.includes(count);
}

export function standardHandSize(playerCount: number): number {
  const size = STANDARD_HAND_SIZE[playerCount];
  if (size === undefined) {
    throw new EngineError(
      "INVALID_GAME_CONFIG",
      `No standard hand size for ${playerCount} players`,
    );
  }
  return size;
}

/**
 * Valid team-size configurations for a player count (§6).
 * E.g. 6 players → [[3,3],[2,2,2]]; 2/3 players → individual sides.
 */
export function standardTeamConfigurations(
  playerCount: number,
): number[][] {
  switch (playerCount) {
    case 2:
      return [[1, 1]];
    case 3:
      return [[1, 1, 1]];
    case 4:
      return [[2, 2]];
    case 6:
      return [
        [3, 3],
        [2, 2, 2],
      ];
    case 8:
      return [[4, 4]];
    case 9:
      return [[3, 3, 3]];
    case 10:
      return [[5, 5]];
    case 12:
      return [
        [6, 6],
        [4, 4, 4],
      ];
    default:
      return [];
  }
}

/** Standard win requirement (§3): two sides → 2 sequences, else 1. */
export function standardRequiredSequences(teamCount: number): number {
  return teamCount === 2 ? 2 : 1;
}

/**
 * Builds interleaved turn order so teammates never sit consecutively (§7):
 * two teams → A1 B1 A2 B2 …; three teams → A1 B1 C1 A2 …
 */
export function buildTurnOrder(
  teamMemberIds: readonly (readonly PlayerId[])[],
): PlayerId[] {
  const order: PlayerId[] = [];
  const maxSize = Math.max(...teamMemberIds.map((m) => m.length));
  for (let round = 0; round < maxSize; round++) {
    for (const members of teamMemberIds) {
      const playerId = members[round];
      if (playerId !== undefined) {
        order.push(playerId);
      }
    }
  }
  return order;
}

export interface CreateGamePlayerInput {
  readonly id?: string;
  readonly name: string;
}

export interface CreateGameOptions {
  readonly gameId?: string;
  readonly players: readonly CreateGamePlayerInput[];
  /**
   * Team sizes, e.g. [3, 3] for 6 players. Defaults to the first valid
   * Standard configuration for the player count.
   */
  readonly teamSizes?: readonly number[];
  /** Override hand size (Custom mode). Standard value used when omitted. */
  readonly handSize?: number;
  /** Override required sequences (Custom mode). */
  readonly requiredSequences?: number;
  readonly board?: BoardDefinition;
  /** RNG seed. Online matches must pass a cryptographically secure seed (§20). */
  readonly seed?: string;
  readonly rulesVersion?: string;
  readonly allowDeadCardExchange?: boolean;
  readonly maxDeadCardExchangesPerTurn?: number;
  readonly turnDurationMs?: number | null;
  readonly now?: () => string;
}

const DEFAULT_TEAM_NAMES = ["Team A", "Team B", "Team C"];
const INDIVIDUAL_TEAM_NAMES = ["Blue", "Gold", "Red", "Green"];

/**
 * Creates a game in LOBBY status with teams and turn order assigned.
 * Dealing happens in {@link startGame} (§21).
 */
export function createGame(options: CreateGameOptions): GameState {
  const playerCount = options.players.length;

  let teamSizes: readonly number[];
  if (options.teamSizes) {
    teamSizes = options.teamSizes;
  } else {
    const configs = standardTeamConfigurations(playerCount);
    const first = configs[0];
    if (!first) {
      throw new EngineError(
        "INVALID_GAME_CONFIG",
        `Unsupported player count ${playerCount} for Standard mode`,
      );
    }
    teamSizes = first;
  }

  validateGameConfig({
    playerCount,
    teamSizes,
    handSize: options.handSize,
    requiredSequences: options.requiredSequences,
  });

  const handSize = options.handSize ?? standardHandSize(playerCount);
  const teamCount = teamSizes.length;
  const requiredSequences =
    options.requiredSequences ?? standardRequiredSequences(teamCount);

  // Build teams in seat order: first N players → team 1, etc.
  const teams: TeamState[] = [];
  const players: PlayerState[] = [];
  let cursor = 0;
  teamSizes.forEach((size, teamIndex) => {
    const teamId: TeamId = `team-${teamIndex + 1}`;
    const isIndividual = teamSizes.every((s) => s === 1);
    const name = isIndividual
      ? (INDIVIDUAL_TEAM_NAMES[teamIndex] ?? `Team ${teamIndex + 1}`)
      : (DEFAULT_TEAM_NAMES[teamIndex] ?? `Team ${teamIndex + 1}`);
    const memberIds: PlayerId[] = [];
    for (let i = 0; i < size; i++) {
      const input = options.players[cursor];
      if (!input) {
        throw new EngineError("INVALID_GAME_CONFIG", "Not enough players");
      }
      const playerId = input.id ?? `player-${cursor + 1}`;
      const seat = cursor;
      players.push({ id: playerId, name: input.name, seat, teamId });
      memberIds.push(playerId);
      cursor++;
    }
    teams.push({ id: teamId, name, memberIds });
  });

  const memberGroups = teams.map((t) => [...t.memberIds]);
  const turnOrder = buildTurnOrder(memberGroups);

  // Setup-time randomness uses its own deterministic stream seeded by the
  // provided seed so dealing and starting player are reproducible (§20, §22).
  const seed = options.seed ?? "quintara-local-default-seed";
  const rng: RngState = createRngState(seed);

  const deck = createStandardDeck();
  const cards: Record<CardId, Card> = {};
  for (const card of deck) {
    cards[card.id] = card;
  }

  const hands: Record<PlayerId, CardId[]> = {};
  const discardPiles: Record<PlayerId, CardId[]> = {};
  for (const player of players) {
    hands[player.id] = [];
    discardPiles[player.id] = [];
  }

  const boardDefinition = options.board ?? createStandardBoardDefinition();

  const rulesConfig: GameRulesConfig = {
    handSize,
    allowDeadCardExchange: options.allowDeadCardExchange ?? true,
    maxDeadCardExchangesPerTurn: options.maxDeadCardExchangesPerTurn ?? 1,
    turnDurationMs: options.turnDurationMs ?? null,
  };

  const state: GameState = {
    id: options.gameId ?? "game-local",
    rulesConfig,
    rulesVersion: options.rulesVersion ?? RULES_VERSION,
    status: "LOBBY",
    resultType: null,
    players,
    teams,
    board: {
      definitionId: boardDefinition.id,
      cells: buildEmptyOccupancy(boardDefinition),
    },
    boardDefinition,
    cards,
    turnOrder,
    startingSeat: 0,
    currentTurnIndex: 0,
    turnNumber: 1,
    turnPhase: "TURN_START",
    drawPile: [],
    hands,
    discardPiles,
    completedSequences: Object.fromEntries(
      teams.map((t) => [t.id, []]),
    ),
    sequenceMembership: {},
    sequenceCounter: 0,
    deadCardExchangeUsed: false,
    pendingSequenceOptions: null,
    requiredSequences,
    winnerTeamId: null,
    version: 0,
    rng,
    rngVersion: RNG_ALGORITHM_VERSION,
    consecutiveNoActionSkips: 0,
    createdAt: (options.now ?? (() => new Date().toISOString()))(),
    finishedAt: null,
  };

  return state;
}

export function getRulesConfig(state: GameState): GameRulesConfig {
  return state.rulesConfig;
}

function validateGameConfig(input: {
  playerCount: number;
  teamSizes: readonly number[];
  handSize?: number | undefined;
  requiredSequences?: number | undefined;
}): void {
  const { playerCount, teamSizes } = input;

  const teamTotal = teamSizes.reduce((a, b) => a + b, 0);
  if (teamTotal !== playerCount) {
    throw new EngineError(
      "INVALID_GAME_CONFIG",
      `Team sizes sum to ${teamTotal} but there are ${playerCount} players`,
    );
  }
  if (teamSizes.length < 2 || teamSizes.length > 3) {
    throw new EngineError(
      "INVALID_GAME_CONFIG",
      "Standard Quintara supports 2 or 3 competing sides",
    );
  }
  if (teamSizes.some((s) => !Number.isInteger(s) || s < 1)) {
    throw new EngineError(
      "INVALID_GAME_CONFIG",
      "Team sizes must be positive integers",
    );
  }

  // Reject unsupported Standard counts (§4) unless explicitly overridden by
  // Custom mode (handSize/requiredSequences provided).
  const isCustom =
    input.handSize !== undefined || input.requiredSequences !== undefined;
  if (!isCustom && !isStandardPlayerCount(playerCount)) {
    throw new EngineError(
      "INVALID_GAME_CONFIG",
      `Unsupported Standard player count ${playerCount} (allowed: ${STANDARD_PLAYER_COUNTS.join(", ")})`,
    );
  }
  if (input.handSize !== undefined) {
    if (!Number.isInteger(input.handSize) || input.handSize < 1) {
      throw new EngineError(
        "INVALID_GAME_CONFIG",
        "handSize must be a positive integer",
      );
    }
  }
  if (input.requiredSequences !== undefined) {
    if (!Number.isInteger(input.requiredSequences) || input.requiredSequences < 1) {
      throw new EngineError(
        "INVALID_GAME_CONFIG",
        "requiredSequences must be a positive integer",
      );
    }
  }
  if (playerCount < 2) {
    throw new EngineError(
      "INVALID_GAME_CONFIG",
      "Quintara requires at least 2 players",
    );
  }
}

function buildEmptyOccupancy(
  board: BoardDefinition,
): Record<string, { occupantTeamId: null; occupantPlayerId: null }> {
  const cells: Record<
    string,
    { occupantTeamId: null; occupantPlayerId: null }
  > = {};
  for (const cell of board.cells) {
    if (cell.type === "CARD") {
      cells[cell.id] = { occupantTeamId: null, occupantPlayerId: null };
    }
  }
  return cells;
}

/**
 * Shuffles the deck, deals hands, selects the starting player uniformly (§22)
 * and begins the first turn. Status LOBBY → ACTIVE.
 *
 * Emits GAME_STARTED + TURN_STARTED (with the turn-start no-legal-action
 * safeguard, §75) via the standard event model.
 */
export function startGame(
  state: GameState,
  now: Clock = wallClock,
): EngineResult {
  if (state.status !== "LOBBY") {
    throw new EngineError("GAME_ALREADY_STARTED");
  }

  const config = state.rulesConfig;
  let rng = state.rng;

  const allCards = Object.keys(state.cards).sort();
  const dealResult = shuffled(rng, allCards);
  rng = dealResult.state;
  const shuffledIds = dealResult.items;

  const hands: Record<PlayerId, CardId[]> = {};
  for (const player of state.players) {
    hands[player.id] = [];
  }
  let cursor = 0;
  for (let i = 0; i < config.handSize; i++) {
    for (const playerId of state.turnOrder) {
      const cardId = shuffledIds[cursor++];
      if (cardId !== undefined) {
        (hands[playerId] as CardId[]).push(cardId);
      }
    }
  }
  const drawPile = shuffledIds.slice(cursor);

  // Starting player: uniform over turn order (§22).
  const startResult = pickUniform(rng, state.turnOrder.length);
  rng = startResult.state;
  const startingSeat = startResult.value;

  const started: GameState = {
    ...state,
    status: "ACTIVE",
    hands,
    drawPile,
    startingSeat,
    currentTurnIndex: startingSeat,
    turnNumber: 1,
    turnPhase: "AWAITING_MAIN_ACTION",
    deadCardExchangeUsed: false,
    version: state.version + 1,
    rng,
  };

  const firstTurn = startTurnsWithSafeguard(started, now);
  return {
    state: firstTurn.state,
    events: [
      {
        type: "GAME_STARTED",
        gameId: state.id,
        startingPlayerId: state.turnOrder[startingSeat] ?? "",
        startingSeat,
      },
      ...firstTurn.events,
    ],
  };
}
