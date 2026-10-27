/**
 * Authoritative command application (§28, §34–§40, §79–§81, §83, §168).
 *
 * Commands are validated in the fixed rule precedence order (§168) and
 * resolved atomically: validate → mutate → detect → select → victory →
 * draw → advance. applyCommand is pure: it returns a new state plus the
 * deterministic domain events (§83).
 */

import type { CellId } from "./board.js";
import { getCellDefinition } from "./board.js";
import {
  getCard,
  isJackCode,
  type CardId,
} from "./cards.js";
import { isDeadCard } from "./dead-cards.js";
import { discardCard, drawCards } from "./draw.js";
import { EngineError } from "./errors.js";
import type { DomainEvent, EngineResult } from "./events.js";
import {
  isOneEyedJack,
  isTwoEyedJack,
} from "./jacks.js";
import {
  defaultSequenceOption,
  findMaximumCompatibleSets,
  toSelectionOptions,
} from "./overlap.js";
import {
  canonicalCellKey,
  detectCandidateSequences,
  registerSequences,
} from "./sequences.js";
import {
  currentPlayerId,
  getPlayer,
  type ActionId,
  type GameState,
  type PlayerId,
  type SequenceCandidate,
} from "./state.js";
import {
  completeTurnAndAdvance,
  enforceNoLegalActionSafeguard,
  withBoardChange,
} from "./turns.js";
import {
  checkVictory,
  finishGameWithWinner,
  wallClock,
  type Clock,
} from "./victory.js";

// ---------------------------------------------------------------------------
// Command model (§81)
// ---------------------------------------------------------------------------

export interface CommandBase {
  /** Authenticated actor. The server fills this from the session — clients
   *  never determine the acting player (§28, §139). */
  readonly playerId: PlayerId;
  /** Idempotency key (§79). Retries with the same actionId must not reapply. */
  readonly actionId: ActionId;
  /** Optimistic concurrency (§80). Mismatch → STALE_GAME_STATE. */
  readonly expectedVersion?: number;
}

export interface ExchangeDeadCardCommand extends CommandBase {
  readonly type: "EXCHANGE_DEAD_CARD";
  readonly cardId: CardId;
}

export interface PlayNormalCardCommand extends CommandBase {
  readonly type: "PLAY_NORMAL_CARD";
  readonly cardId: CardId;
  readonly targetCellId: CellId;
}

export interface PlayWildJackCommand extends CommandBase {
  readonly type: "PLAY_WILD_JACK";
  readonly cardId: CardId;
  readonly targetCellId: CellId;
}

export interface PlayRemoveJackCommand extends CommandBase {
  readonly type: "PLAY_REMOVE_JACK";
  readonly cardId: CardId;
  readonly targetCellId: CellId;
}

export interface SelectSequenceSetCommand extends CommandBase {
  readonly type: "SELECT_SEQUENCE_SET";
  readonly sequenceCellSets: readonly (readonly CellId[])[];
}

export type GameCommand =
  | ExchangeDeadCardCommand
  | PlayNormalCardCommand
  | PlayWildJackCommand
  | PlayRemoveJackCommand
  | SelectSequenceSetCommand;

export type { EngineResult };

// ---------------------------------------------------------------------------
// applyCommand
// ---------------------------------------------------------------------------

/**
 * Optional per-command context. `now` injects a deterministic clock so that
 * replaying a recorded command stream reproduces the state byte-for-byte
 * (§102); live play defaults to the wall clock.
 */
export interface CommandOptions {
  readonly now?: Clock;
}

export function applyCommand(
  state: GameState,
  command: GameCommand,
  options?: CommandOptions,
): EngineResult {
  // §80: optimistic concurrency precondition.
  if (
    command.expectedVersion !== undefined &&
    command.expectedVersion !== state.version
  ) {
    throw new EngineError("STALE_GAME_STATE", undefined, {
      expected: command.expectedVersion,
      actual: state.version,
    });
  }

  switch (command.type) {
    case "EXCHANGE_DEAD_CARD":
      return exchangeDeadCard(state, command);
    case "PLAY_NORMAL_CARD":
      return playNormalCard(state, command, options);
    case "PLAY_WILD_JACK":
      return playWildJack(state, command, options);
    case "PLAY_REMOVE_JACK":
      return playRemoveJack(state, command, options);
    case "SELECT_SEQUENCE_SET":
      return selectSequenceSet(state, command, options);
    default: {
      const exhaustive: never = command;
      throw new EngineError(
        "INVALID_COMMAND",
        `Unknown command ${JSON.stringify(exhaustive)}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Shared validation (§168 precedence: status → turn → phase → ownership …)
// ---------------------------------------------------------------------------

function assertActiveTurn(
  state: GameState,
  playerId: PlayerId,
  phase: GameState["turnPhase"],
): void {
  if (state.status === "FINISHED") {
    throw new EngineError("GAME_ALREADY_FINISHED");
  }
  if (state.status !== "ACTIVE") {
    throw new EngineError("GAME_NOT_ACTIVE");
  }
  const active = currentPlayerId(state);
  if (active !== playerId) {
    throw new EngineError("NOT_YOUR_TURN", undefined, { active });
  }
  if (state.turnPhase !== phase) {
    throw new EngineError("INVALID_PHASE", undefined, {
      expected: phase,
      actual: state.turnPhase,
    });
  }
}

function assertOwnsCard(
  state: GameState,
  playerId: PlayerId,
  cardId: CardId,
): void {
  const hand = state.hands[playerId] ?? [];
  if (!hand.includes(cardId)) {
    throw new EngineError("CARD_NOT_OWNED", undefined, { cardId });
  }
}

function assertTargetCellExists(
  state: GameState,
  targetCellId: CellId,
): "CARD" | "WILD_CORNER" {
  let cell;
  try {
    cell = getCellDefinition(state.boardDefinition, targetCellId);
  } catch {
    throw new EngineError("INVALID_TARGET", undefined, { targetCellId });
  }
  return cell.type;
}

// ---------------------------------------------------------------------------
// EXCHANGE_DEAD_CARD (§29–§30, §155)
// ---------------------------------------------------------------------------

function exchangeDeadCard(
  state: GameState,
  command: ExchangeDeadCardCommand,
): EngineResult {
  assertActiveTurn(state, command.playerId, "AWAITING_MAIN_ACTION");

  if (state.deadCardExchangeUsed) {
    throw new EngineError("DEAD_CARD_ALREADY_EXCHANGED");
  }
  if (!state.rulesConfig.allowDeadCardExchange) {
    throw new EngineError("INVALID_PHASE", "Dead-card exchange is disabled");
  }

  assertOwnsCard(state, command.playerId, command.cardId);
  const card = getCard(state.cards, command.cardId);
  if (isJackCode(card.code)) {
    // §41: Jacks are never dead cards and never eligible for exchange.
    throw new EngineError("INVALID_JACK_TYPE", "Jacks cannot be exchanged");
  }
  if (!isDeadCard(state, card)) {
    throw new EngineError("CARD_NOT_DEAD");
  }

  // Resolve atomically (§29): discard → draw replacement → mark used.
  let current = discardCard(state, command.playerId, command.cardId);
  const events: DomainEvent[] = [];
  events.push({
    type: "DEAD_CARD_EXCHANGED",
    playerId: command.playerId,
    cardId: card.id,
    cardCode: card.code,
  });

  const drawn = drawCards(
    current,
    command.playerId,
    1,
    "DEAD_CARD_REPLACEMENT",
  );
  current = drawn.state;
  events.push(...drawn.events);

  current = {
    ...current,
    deadCardExchangeUsed: true,
  };

  // §75: if the replacement leaves zero legal actions, skip the turn.
  const safeguard = enforceNoLegalActionSafeguard(current);
  return {
    state: incrementVersionIfNeeded(safeguard.state, state.version),
    events: [...events, ...safeguard.events],
  };
}

// ---------------------------------------------------------------------------
// PLAY_NORMAL_CARD (§31–§34, §153)
// ---------------------------------------------------------------------------

function playNormalCard(
  state: GameState,
  command: PlayNormalCardCommand,
  options?: CommandOptions,
): EngineResult {
  assertActiveTurn(state, command.playerId, "AWAITING_MAIN_ACTION");
  assertOwnsCard(state, command.playerId, command.cardId);
  const card = getCard(state.cards, command.cardId);
  if (isJackCode(card.code)) {
    throw new EngineError("INVALID_JACK_TYPE", "Play Jacks with their own actions");
  }

  const cellType = assertTargetCellExists(state, command.targetCellId);
  if (cellType !== "CARD") {
    throw new EngineError("INVALID_TARGET", "Wild corners cannot be targeted");
  }
  const cell = getCellDefinition(state.boardDefinition, command.targetCellId);
  if (cell.type === "CARD" && cell.cardCode !== card.code) {
    throw new EngineError("TARGET_CARD_MISMATCH", undefined, {
      card: card.code,
      cell: cell.cardCode,
    });
  }
  const occupancy = state.board.cells[command.targetCellId];
  if (!occupancy || occupancy.occupantTeamId !== null) {
    throw new EngineError("TARGET_OCCUPIED");
  }

  // Resolution (§34): discard → place marker → sequences → victory → draw.
  const preEvents: DomainEvent[] = [];
  let current = discardCard(state, command.playerId, command.cardId);
  current = placeMarker(current, command.playerId, command.targetCellId);
  preEvents.push({
    type: "CARD_PLAYED",
    playerId: command.playerId,
    cardId: card.id,
    cardCode: card.code,
  });
  preEvents.push({
    type: "MARKER_PLACED",
    playerId: command.playerId,
    teamId: getPlayer(current, command.playerId).teamId,
    cellId: command.targetCellId,
  });

  return resolvePlacementTurn(
    current,
    command,
    command.targetCellId,
    preEvents,
    options,
  );
}

// ---------------------------------------------------------------------------
// PLAY_WILD_JACK (§35–§36)
// ---------------------------------------------------------------------------

function playWildJack(
  state: GameState,
  command: PlayWildJackCommand,
  options?: CommandOptions,
): EngineResult {
  assertActiveTurn(state, command.playerId, "AWAITING_MAIN_ACTION");
  assertOwnsCard(state, command.playerId, command.cardId);
  const card = getCard(state.cards, command.cardId);
  if (!isTwoEyedJack(card)) {
    throw new EngineError("INVALID_JACK_TYPE", "Not a Two-Eyed Jack");
  }

  const cellType = assertTargetCellExists(state, command.targetCellId);
  if (cellType !== "CARD") {
    throw new EngineError("INVALID_TARGET", "Wild corners cannot be targeted");
  }
  const occupancy = state.board.cells[command.targetCellId];
  if (!occupancy || occupancy.occupantTeamId !== null) {
    throw new EngineError("TARGET_OCCUPIED");
  }

  const preEvents: DomainEvent[] = [];
  let current = discardCard(state, command.playerId, command.cardId);
  current = placeMarker(current, command.playerId, command.targetCellId);
  preEvents.push({
    type: "CARD_PLAYED",
    playerId: command.playerId,
    cardId: card.id,
    cardCode: card.code,
  });
  preEvents.push({
    type: "MARKER_PLACED",
    playerId: command.playerId,
    teamId: getPlayer(current, command.playerId).teamId,
    cellId: command.targetCellId,
  });

  return resolvePlacementTurn(
    current,
    command,
    command.targetCellId,
    preEvents,
    options,
  );
}

// ---------------------------------------------------------------------------
// PLAY_REMOVE_JACK (§37–§40, §154)
// ---------------------------------------------------------------------------

function playRemoveJack(
  state: GameState,
  command: PlayRemoveJackCommand,
  options?: CommandOptions,
): EngineResult {
  assertActiveTurn(state, command.playerId, "AWAITING_MAIN_ACTION");
  assertOwnsCard(state, command.playerId, command.cardId);
  const card = getCard(state.cards, command.cardId);
  if (!isOneEyedJack(card)) {
    throw new EngineError("INVALID_JACK_TYPE", "Not a One-Eyed Jack");
  }

  const cellType = assertTargetCellExists(state, command.targetCellId);
  if (cellType !== "CARD") {
    throw new EngineError("INVALID_TARGET", "Wild corners cannot be targeted");
  }

  const occupancy = state.board.cells[command.targetCellId];
  if (!occupancy || occupancy.occupantTeamId === null) {
    throw new EngineError("INVALID_JACK_TARGET", "No marker to remove there");
  }
  const actingTeamId = getPlayer(state, command.playerId).teamId;
  if (occupancy.occupantTeamId === actingTeamId) {
    // §38: teammates may never target one another.
    throw new EngineError("CANNOT_TARGET_TEAMMATE");
  }
  if ((state.sequenceMembership[command.targetCellId]?.length ?? 0) > 0) {
    // §39: markers in completed sequences are protected.
    throw new EngineError("PROTECTED_MARKER");
  }

  // Resolution (§40): discard → remove marker → draw → advance. No sequence
  // detection — an empty cell cannot complete a line.
  const events: DomainEvent[] = [];
  let current = discardCard(state, command.playerId, command.cardId);
  current = {
    ...current,
    board: {
      ...current.board,
      cells: {
        ...current.board.cells,
        [command.targetCellId]: {
          occupantTeamId: null,
          occupantPlayerId: null,
        },
      },
    },
  };
  current = withBoardChange(current);

  events.push({
    type: "CARD_PLAYED",
    playerId: command.playerId,
    cardId: card.id,
    cardCode: card.code,
  });
  events.push({
    type: "MARKER_REMOVED",
    playerId: command.playerId,
    removedTeamId: occupancy.occupantTeamId,
    removedPlayerId: occupancy.occupantPlayerId ?? "",
    cellId: command.targetCellId,
  });

  const drawn = drawCards(current, command.playerId, 1, "TURN_REFILL");
  current = drawn.state;
  events.push(...drawn.events);

  const advanced = completeTurnAndAdvance(current, options?.now ?? wallClock);
  return {
    state: withVersion(advanced.state, state.version),
    events: [...events, ...advanced.events],
  };
}

// ---------------------------------------------------------------------------
// SELECT_SEQUENCE_SET (§66–§68)
// ---------------------------------------------------------------------------

function selectSequenceSet(
  state: GameState,
  command: SelectSequenceSetCommand,
  options?: CommandOptions,
): EngineResult {
  assertActiveTurn(state, command.playerId, "AWAITING_SEQUENCE_SELECTION");

  const pendingOptions = state.pendingSequenceOptions ?? [];
  if (pendingOptions.length === 0) {
    throw new EngineError("INVALID_PHASE", "No sequence selection pending");
  }

  // §67: the client cannot submit arbitrary coordinates — the selection must
  // equal one of the previously computed maximum valid options.
  const providedKey = [...command.sequenceCellSets]
    .map((cells) => canonicalCellKey([...cells]))
    .sort()
    .join("||");

  const matched = pendingOptions.find(
    (option) =>
      [...option.sequences]
        .map((s) => canonicalCellKey(s.cells))
        .sort()
        .join("||") === providedKey,
  );
  if (!matched) {
    throw new EngineError("INVALID_SEQUENCE_SELECTION", undefined, {
      provided: providedKey,
    });
  }

  return registerSelectionAndFinishTurn(
    state,
    command,
    matched.sequences,
    [],
    options,
  );
}

/**
 * Deterministic default claim for selection timeout (§68). The server calls
 * this and submits SELECT_SEQUENCE_SET with the result — never RNG.
 */
export function resolveSequenceSelectionDefault(
  state: GameState,
): readonly SequenceCandidate[] {
  const options = state.pendingSequenceOptions ?? [];
  return defaultSequenceOption(options).sequences;
}

// ---------------------------------------------------------------------------
// Placement turn resolution (§34, §47, §63–§66)
// ---------------------------------------------------------------------------

function resolvePlacementTurn(
  state: GameState,
  command: PlayNormalCardCommand | PlayWildJackCommand,
  placedCellId: CellId,
  preEvents: DomainEvent[],
  options?: CommandOptions,
): EngineResult {
  const playerId = command.playerId;
  const teamId = getPlayer(state, playerId).teamId;

  const candidates = detectCandidateSequences(state, teamId, placedCellId);
  const existing = state.completedSequences[teamId] ?? [];
  const maxSets = findMaximumCompatibleSets(candidates, existing);

  const hasSequences =
    maxSets.length > 0 && (maxSets[0]?.length ?? 0) > 0;

  if (!hasSequences) {
    return finishTurn(state, command.actionId, preEvents, undefined, options);
  }

  if (maxSets.length === 1) {
    const chosen = maxSets[0] as SequenceCandidate[];
    return registerSelectionAndFinishTurn(
      state,
      command,
      chosen,
      preEvents,
      options,
    );
  }

  // §63–§66: ambiguous maximum → the acting player selects (§66).
  const selectionOptions = toSelectionOptions(maxSets);
  const next: GameState = {
    ...state,
    turnPhase: "AWAITING_SEQUENCE_SELECTION",
    pendingSequenceOptions: selectionOptions,
    version: state.version + 1,
  };
  return {
    state: next,
    events: [
      ...preEvents,
      {
        type: "SEQUENCE_SELECTION_REQUIRED",
        playerId,
        teamId,
        optionCount: selectionOptions.length,
      },
    ],
  };
}

function registerSelectionAndFinishTurn(
  state: GameState,
  command: GameCommand,
  sequences: readonly SequenceCandidate[],
  preEvents: DomainEvent[] = [],
  options?: CommandOptions,
): EngineResult {
  const playerId = command.playerId;
  const registered = registerSequences(
    { ...state, pendingSequenceOptions: null },
    sequences,
    command.actionId,
  );
  const current = registered.state;
  const events: DomainEvent[] = [...preEvents, ...registered.events];

  // §73: victory is immediate once the requirement is reached.
  const teamId = getPlayer(current, playerId).teamId;
  if (checkVictory(current, teamId)) {
    const result = finishGameWithWinner(
      current,
      teamId,
      playerId,
      command.actionId,
      options?.now,
    );
    return {
      state: withVersion(result.state, state.version),
      events: [...events, ...result.events],
    };
  }

  return finishTurn(current, command.actionId, events, state.version, options);
}

/**
 * Non-winning turn tail (§46, §153): automatic replacement draw, then
 * turn completion and advancement with the turn-start safeguard.
 *
 * `originalVersion` is the state version at command entry so the whole
 * command increments the version exactly once (§80).
 */
function finishTurn(
  state: GameState,
  _actionId: ActionId,
  priorEvents: DomainEvent[],
  originalVersion?: number,
  options?: CommandOptions,
): EngineResult {
  const playerId = currentPlayerId(state);
  if (playerId === null) {
    return { state, events: priorEvents };
  }

  const events = [...priorEvents];
  let current = state;

  const drawn = drawCards(current, playerId, 1, "TURN_REFILL");
  current = drawn.state;
  events.push(...drawn.events);

  const advanced = completeTurnAndAdvance(current, options?.now);
  return {
    state: withVersion(
      advanced.state,
      originalVersion ?? state.version,
    ),
    events: [...events, ...advanced.events],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function placeMarker(
  state: GameState,
  playerId: PlayerId,
  cellId: CellId,
): GameState {
  const teamId = getPlayer(state, playerId).teamId;
  const placed: GameState = {
    ...state,
    board: {
      ...state.board,
      cells: {
        ...state.board.cells,
        [cellId]: {
          occupantTeamId: teamId,
          occupantPlayerId: playerId,
        },
      },
    },
  };
  return withBoardChange(placed);
}

function withVersion(state: GameState, previousVersion: number): GameState {
  return incrementVersionIfNeeded(state, previousVersion);
}

/**
 * Ensures exactly one version increment per successful command (§80),
 * regardless of how many helper transforms ran.
 */
function incrementVersionIfNeeded(
  state: GameState,
  previousVersion: number,
): GameState {
  if (state.version === previousVersion) {
    return { ...state, version: previousVersion + 1 };
  }
  return state;
}
