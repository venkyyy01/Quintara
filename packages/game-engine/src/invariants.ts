/**
 * Engine invariant validation (§111 ENGINE INVARIANTS).
 *
 * Asserted after every successful command in non-production tests, and
 * available as a cheap production health check.
 */

import {
  parseCellId,
  SEQUENCE_LENGTH,
  type CellId,
} from "./board.js";
import { countAllCards } from "./draw.js";
import {
  intersectionSize,
  qualifiesForTeam,
} from "./sequences.js";
import { standardTeamConfigurations } from "./setup.js";
import {
  RULES_VERSION,
  type CompletedSequence,
  type GameState,
  type SequenceId,
} from "./state.js";

export function validateGameState(state: GameState): string[] {
  const issues: string[] = [];

  // 104 cards exist exactly once (§19).
  const seenCards = new Set<string>();
  const zones: string[][] = [
    [...state.drawPile],
    ...state.players.map((p) => [...(state.hands[p.id] ?? [])]),
    ...state.players.map((p) => [...(state.discardPiles[p.id] ?? [])]),
  ];
  for (const zone of zones) {
    for (const cardId of zone) {
      if (seenCards.has(cardId)) {
        issues.push(`card ${cardId} exists in multiple zones`);
      }
      seenCards.add(cardId);
      if (!state.cards[cardId]) {
        issues.push(`card ${cardId} missing from catalog`);
      }
    }
  }
  const total = countAllCards(state);
  const expectedTotal = Object.keys(state.cards).length;
  if (total !== expectedTotal) {
    issues.push(`card conservation violated: ${total} of ${expectedTotal}`);
  }

  // Board coordinates unique + wild corners unoccupied (§11, §13).
  for (const cell of state.boardDefinition.cells) {
    const occupancy = state.board.cells[cell.id];
    if (cell.type === "WILD_CORNER") {
      if (occupancy && occupancy.occupantTeamId !== null) {
        issues.push(`wild corner ${cell.id} is occupied`);
      }
      continue;
    }
    if (!occupancy) {
      issues.push(`card cell ${cell.id} missing occupancy record`);
    }
  }
  for (const cellId of Object.keys(state.board.cells)) {
    const def = state.boardDefinition.cells.find((c) => c.id === cellId);
    if (!def) {
      issues.push(`occupancy for unknown cell ${cellId}`);
    } else if (def.type === "WILD_CORNER") {
      issues.push(`occupancy record on wild corner ${cellId}`);
    }
  }

  // Every player belongs to exactly one team (§5).
  for (const player of state.players) {
    const teamsWith = state.teams.filter((t) => t.memberIds.includes(player.id));
    if (teamsWith.length !== 1) {
      issues.push(`player ${player.id} belongs to ${teamsWith.length} teams`);
    } else if (teamsWith[0]?.id !== player.teamId) {
      issues.push(`player ${player.id} team mismatch`);
    }
  }

  // Turn order contains every player exactly once (§7, §111).
  if (state.turnOrder.length !== state.players.length) {
    issues.push(
      `turn order has ${state.turnOrder.length} seats for ${state.players.length} players`,
    );
  }
  if (new Set(state.turnOrder).size !== state.turnOrder.length) {
    issues.push("turn order contains duplicate players");
  }
  for (const player of state.players) {
    const appearances = state.turnOrder.filter(
      (id) => id === player.id,
    ).length;
    if (appearances !== 1) {
      issues.push(`player ${player.id} appears ${appearances} times in turn order`);
    }
  }

  // Standard configuration must match the immutable preset (§105, §158).
  if (state.rulesVersion === RULES_VERSION) {
    const sizes = state.teams.map((team) => team.memberIds.length);
    const allowed = standardTeamConfigurations(state.players.length);
    const matchesStandard = allowed.some(
      (config) =>
        config.length === sizes.length &&
        config.every((size, index) => size === sizes[index]),
    );
    if (!matchesStandard) {
      issues.push(
        `team sizes [${sizes.join(", ")}] are not a Standard configuration`,
      );
    }
    const expectedRequired = state.teams.length === 2 ? 2 : 1;
    if (state.requiredSequences !== expectedRequired) {
      issues.push(
        `requiredSequences is ${state.requiredSequences}, expected ${expectedRequired}`,
      );
    }
    // The Standard preset is immutable: optional custom rules must never be
    // smuggled in under the Standard rulesVersion.
    if (state.rulesConfig.allowDeadCardExchange !== true) {
      issues.push("Standard games must allow the dead-card exchange");
    }
    if (state.rulesConfig.maxDeadCardExchangesPerTurn !== 1) {
      issues.push("Standard games allow exactly one dead-card exchange per turn");
    }
    if (state.rulesConfig.turnDurationMs !== null) {
      issues.push("Standard games must not carry a custom turn timer");
    }
  }

  // Status/turn-phase consistency (§157).
  if (state.status === "FINISHED" && state.turnPhase !== "GAME_OVER") {
    issues.push("finished game must be in GAME_OVER phase");
  }
  if (
    state.status === "ACTIVE" &&
    state.turnPhase !== "AWAITING_MAIN_ACTION" &&
    state.turnPhase !== "AWAITING_SEQUENCE_SELECTION"
  ) {
    issues.push(`active game has invalid turn phase ${state.turnPhase}`);
  }
  if (
    state.turnPhase === "AWAITING_SEQUENCE_SELECTION" &&
    (state.pendingSequenceOptions?.length ?? 0) === 0
  ) {
    issues.push("sequence-selection phase has no pending options");
  }
  if (
    state.turnPhase !== "AWAITING_SEQUENCE_SELECTION" &&
    state.pendingSequenceOptions !== null
  ) {
    issues.push("pending sequence options outside sequence-selection phase");
  }
  if (
    state.turnPhase === "AWAITING_SEQUENCE_SELECTION" &&
    state.pendingSequenceActionId === null
  ) {
    issues.push("sequence-selection phase has no originating action");
  }
  if (
    state.turnPhase !== "AWAITING_SEQUENCE_SELECTION" &&
    state.pendingSequenceActionId !== null
  ) {
    issues.push("pending sequence action outside sequence-selection phase");
  }

  // Turn player exists (§111).
  if (state.status === "ACTIVE") {
    const active = state.turnOrder[state.currentTurnIndex];
    if (active === undefined) {
      issues.push("current turn index out of range");
    } else if (!state.players.some((p) => p.id === active)) {
      issues.push(`turn player ${active} does not exist`);
    }
    if (state.winnerTeamId !== null) {
      issues.push("active game must not have a winner (§157)");
    }
  }

  // Status/winner consistency (§157, §167).
  if (state.status === "FINISHED") {
    if (state.resultType === "WIN" && state.winnerTeamId === null) {
      issues.push("finished WIN game must have a winnerTeamId");
    }
    if (state.resultType === "STALEMATE" && state.winnerTeamId !== null) {
      issues.push("stalemate must not have a winnerTeamId");
    }
    if (state.resultType === null) {
      issues.push("finished game must declare a resultType");
    }
  }

  // Completed sequences: five unique, straight, contiguous, team-compatible,
  // valid overlap, consistent membership (§52, §55, §56, §70).
  for (const team of state.teams) {
    const sequences = state.completedSequences[team.id] ?? [];
    for (const sequence of sequences) {
      issues.push(...sequenceIssues(state, sequence));
    }
    for (let i = 0; i < sequences.length; i++) {
      for (let j = i + 1; j < sequences.length; j++) {
        const a = sequences[i] as CompletedSequence;
        const b = sequences[j] as CompletedSequence;
        if (intersectionSize(a.cells, b.cells) > 1) {
          issues.push(
            `sequences ${a.id} and ${b.id} overlap by more than one cell`,
          );
        }
      }
    }
  }

  // Membership references real sequences (§70), and protected sequences are
  // not broken (§55: every member cell still qualifies).
  const sequenceById = new Map<SequenceId, CompletedSequence>();
  for (const team of state.teams) {
    for (const sequence of state.completedSequences[team.id] ?? []) {
      sequenceById.set(sequence.id, sequence);
    }
  }
  for (const [cellId, sequenceIds] of Object.entries(state.sequenceMembership)) {
    for (const sequenceId of sequenceIds) {
      const sequence = sequenceById.get(sequenceId);
      if (!sequence) {
        issues.push(`membership on ${cellId} references unknown ${sequenceId}`);
        continue;
      }
      if (!sequence.cells.includes(cellId as CellId)) {
        issues.push(`membership ${sequenceId} does not contain ${cellId}`);
      }
      if (!qualifiesForTeam(state, cellId, sequence.teamId)) {
        issues.push(`protected sequence ${sequenceId} has been broken`);
      }
    }
  }
  for (const sequence of sequenceById.values()) {
    for (const cellId of sequence.cells) {
      const def = state.boardDefinition.cells.find((c) => c.id === cellId);
      if (def && def.type === "CARD") {
        const member = state.sequenceMembership[cellId] ?? [];
        if (!member.includes(sequence.id)) {
          issues.push(`sequence ${sequence.id} missing membership on ${cellId}`);
        }
      }
    }
  }

  // Winner satisfies win requirement (§73).
  if (state.status === "FINISHED" && state.winnerTeamId !== null) {
    const count =
      state.completedSequences[state.winnerTeamId]?.length ?? 0;
    if (count < state.requiredSequences) {
      issues.push(
        `winner ${state.winnerTeamId} has ${count} sequences, needs ${state.requiredSequences}`,
      );
    }
  }

  return issues;
}

function sequenceIssues(
  state: GameState,
  sequence: CompletedSequence,
): string[] {
  const issues: string[] = [];
  const cells = sequence.cells;

  if (cells.length !== SEQUENCE_LENGTH) {
    issues.push(`sequence ${sequence.id} does not have 5 cells`);
    return issues;
  }
  if (new Set(cells).size !== SEQUENCE_LENGTH) {
    issues.push(`sequence ${sequence.id} has duplicate cells`);
  }

  const coords = cells.map((cellId) => parseCellId(cellId));
  const drSet = new Set<number>();
  const dcSet = new Set<number>();
  for (let i = 1; i < coords.length; i++) {
    drSet.add((coords[i] as { row: number }).row - (coords[i - 1] as { row: number }).row);
    dcSet.add((coords[i] as { column: number }).column - (coords[i - 1] as { column: number }).column);
  }
  const dr = [...drSet];
  const dc = [...dcSet];
  const straight =
    dr.length === 1 &&
    dc.length === 1 &&
    Math.abs(dr[0] as number) <= 1 &&
    Math.abs(dc[0] as number) <= 1 &&
    ((dr[0] as number) !== 0 || (dc[0] as number) !== 0);
  if (!straight) {
    issues.push(`sequence ${sequence.id} is not straight and contiguous`);
  }

  for (const cellId of cells) {
    if (!qualifiesForTeam(state, cellId, sequence.teamId)) {
      issues.push(`sequence ${sequence.id} cell ${cellId} does not qualify`);
    }
  }

  // §53 canonical ordering: registration stores cells in traversal order
  // along the sequence direction; re-check that they are contiguous steps
  // (done above) — the coordinate set itself is exactly what was validated.

  return issues;
}
