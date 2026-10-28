/**
 * Fluent scenario builder for rule tests (§147) and development debug
 * tooling (§146 — never exposed through production server endpoints).
 *
 * Example:
 *   scenario()
 *     .withCurrentPlayer("A")
 *     .withHand("A", ["8H", "JC"])
 *     .withMarker("A", 2, 2)
 *     .build();
 */

import { cellId, type CellId } from "./board.js";
import { type CardCode, type CardId } from "./cards.js";
import { EngineError } from "./errors.js";
import {
  createGame,
  getRulesConfig,
  startGame,
  type CreateGameOptions,
} from "./setup.js";
import type { GameState, PlayerId } from "./state.js";

export interface ScenarioOptions {
  /** Number of players (default 2), aliased A, B, C, … */
  readonly players?: number;
  readonly teamSizes?: readonly number[];
  readonly requiredSequences?: number;
  readonly seed?: string;
}

const ALIASES = "ABCDEFGHIJKL".split("");

export class ScenarioBuilder {
  private readonly options: ScenarioOptions;
  private readonly playerCount: number;
  private handOverrides = new Map<string, CardCode[]>();
  private markerPlacements: { alias: string; row: number; column: number }[] = [];
  private drawPileOverride: CardCode[] | null = null;
  private currentAlias: string | null = null;
  private occupiedOverride: {
    alias: string;
    row: number;
    column: number;
  }[] = [];

  constructor(options: ScenarioOptions = {}) {
    this.options = options;
    this.playerCount = options.players ?? 2;
    if (this.playerCount > ALIASES.length) {
      throw new Error("Scenario builder supports at most 12 players");
    }
  }

  withCurrentPlayer(alias: string): this {
    this.currentAlias = alias;
    return this;
  }

  withHand(alias: string, codes: CardCode[]): this {
    this.handOverrides.set(alias, [...codes]);
    return this;
  }

  /** Places a marker owned by the given player's team at (row, column). */
  withMarker(alias: string, row: number, column: number): this {
    this.markerPlacements.push({ alias, row, column });
    return this;
  }

  /** Places a marker at an explicit cell id (e.g. "r5c6"). */
  withMarkerCell(alias: string, id: CellId): this {
    const match = /^r(\d+)c(\d+)$/.exec(id);
    if (!match) throw new Error(`Malformed cell id ${id}`);
    return this.withMarker(alias, Number(match[1]), Number(match[2]));
  }

  /** Fills specific board cells with opponent-team markers (for dead cards). */
  withOpponentMarker(alias: string, row: number, column: number): this {
    this.occupiedOverride.push({ alias, row, column });
    return this;
  }

  withDrawPile(codes: CardCode[]): this {
    this.drawPileOverride = [...codes];
    return this;
  }

  build(): GameState {
    const names = ALIASES.slice(0, this.playerCount).map((a) => a);
    const createOptions: CreateGameOptions = {
      players: names.map((name) => ({ id: `p-${name}`, name })),
      seed: this.options.seed ?? "scenario-seed",
      teamSizes: this.options.teamSizes
        ? [...this.options.teamSizes]
        : undefined,
      requiredSequences: this.options.requiredSequences,
    };
    const created = createGame(createOptions);
    const started = startGame(created);
    const state = started.state;

    const aliasToId = new Map<string, PlayerId>();
    names.forEach((name) => aliasToId.set(name, `p-${name}`));

    // With no hand overrides and no draw-pile override, keep the naturally
    // dealt game (useful for random-playout property tests).
    if (this.handOverrides.size === 0 && this.drawPileOverride === null) {
      return this.applyMarkersAndTurn(state, aliasToId, names);
    }

    // Collect all physical card instances by code.
    const byCode = new Map<CardCode, CardId[]>();
    for (const card of Object.values(state.cards)) {
      const list = byCode.get(card.code) ?? [];
      list.push(card.id);
      byCode.set(card.code, list);
    }
    const used = new Set<CardId>();
    const takeCard = (code: CardCode): CardId => {
      const list = byCode.get(code) ?? [];
      for (const id of list) {
        if (!used.has(id)) {
          used.add(id);
          return id;
        }
      }
      throw new Error(`No unused card instance for code ${code}`);
    };

    // Hands: specified players get the exact codes; everyone else empty.
    const hands: Record<PlayerId, CardId[]> = {};
    for (const [alias, codes] of this.handOverrides) {
      const playerId = aliasToId.get(alias);
      if (!playerId) throw new Error(`Unknown player alias ${alias}`);
      hands[playerId] = codes.map((code) => takeCard(code));
    }
    for (const name of names) {
      const playerId = aliasToId.get(name) as PlayerId;
      if (!hands[playerId]) hands[playerId] = [];
    }

    // Draw pile: explicit override, else all remaining cards. When an
    // override is given, the remaining cards go to the first player's discard
    // pile so card conservation (§19) always holds.
    let drawPile: CardId[];
    const discardPiles: Record<PlayerId, CardId[]> = {};
    for (const name of names) {
      discardPiles[aliasToId.get(name) as PlayerId] = [];
    }
    if (this.drawPileOverride) {
      drawPile = this.drawPileOverride.map((code) => takeCard(code));
      const leftovers = Object.keys(state.cards)
        .filter((id) => !used.has(id))
        .sort();
      const firstPlayer = aliasToId.get(names[0] ?? "A") as PlayerId;
      discardPiles[firstPlayer] = leftovers;
    } else {
      drawPile = Object.keys(state.cards)
        .filter((id) => !used.has(id))
        .sort();
    }

    return this.applyMarkersAndTurn(
      state,
      aliasToId,
      names,
      hands,
      drawPile,
      discardPiles,
    );
  }

  private applyMarkersAndTurn(
    state: GameState,
    aliasToId: Map<string, PlayerId>,
    names: string[],
    hands?: Record<PlayerId, CardId[]>,
    drawPile?: CardId[],
    discardPiles?: Record<PlayerId, CardId[]>,
  ): GameState {
    // Markers.
    const boardCells = { ...state.board.cells };
    for (const placement of [...this.markerPlacements, ...this.occupiedOverride]) {
      const playerId = aliasToId.get(placement.alias);
      if (!playerId) throw new Error(`Unknown player alias ${placement.alias}`);
      const player = state.players.find((p) => p.id === playerId);
      const id: CellId = cellId(placement.row, placement.column);
      if (!boardCells[id]) {
        throw new EngineError(
          "INVALID_TARGET",
          `Cannot place marker on ${id} (wild corner or off-board)`,
        );
      }
      boardCells[id] = {
        occupantTeamId: player?.teamId ?? null,
        occupantPlayerId: playerId,
      };
    }

    // Current player.
    const currentAlias = this.currentAlias ?? names[0] ?? "A";
    const currentId = aliasToId.get(currentAlias);
    const currentIndex = state.turnOrder.findIndex((id) => id === currentId);

    return {
      ...state,
      ...(hands ? { hands } : {}),
      ...(drawPile ? { drawPile } : {}),
      ...(discardPiles ? { discardPiles } : {}),
      board: { ...state.board, cells: boardCells },
      currentTurnIndex: currentIndex >= 0 ? currentIndex : state.currentTurnIndex,
      turnNumber: 1,
      turnPhase: "AWAITING_MAIN_ACTION",
      deadCardExchangeUsed: false,
      pendingSequenceOptions: null,
      pendingSequenceActionId: null,
      version: 0,
    };
  }
}

export function scenario(options?: ScenarioOptions): ScenarioBuilder {
  return new ScenarioBuilder(options);
}

/** Re-derive the effective rules config for scenario states (test helper). */
export function scenarioRulesConfig(state: GameState) {
  return getRulesConfig(state);
}
