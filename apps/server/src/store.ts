/**
 * Persistence boundary (§72, §102, §138).
 *
 * The server persists processed action ids (idempotency, §79), game events
 * (replay, §102) and game summaries. The default store is in-memory; the
 * interface is deliberately small so a PostgreSQL/Redis adapter can be
 * dropped in for multi-instance deployments without touching game logic.
 */

import type { DomainEvent, GameCommand, GameState } from "@quintara/game-engine";
import type { GameSummary } from "@quintara/shared-types";

export interface StoredAction {
  readonly actionId: string;
  readonly playerId: string;
  readonly requestId: string;
  readonly versionAfter: number;
  readonly storedAt: number;
}

export interface StoredGame {
  readonly gameId: string;
  readonly roomId: string;
  initialState: GameState;
  currentState: GameState;
  commands: GameCommand[];
  events: DomainEvent[];
  processedActions: Map<string, StoredAction>;
  summary: GameSummary | null;
}

export interface GameStore {
  saveGame(game: StoredGame): Promise<void>;
  getGame(gameId: string): Promise<StoredGame | null>;
  saveSummary(summary: GameSummary): Promise<void>;
  listSummaries(limit: number): Promise<GameSummary[]>;
  getProcessedAction(
    gameId: string,
    actionId: string,
  ): Promise<StoredAction | null>;
}

export class InMemoryGameStore implements GameStore {
  private readonly games = new Map<string, StoredGame>();
  private readonly summaries: GameSummary[] = [];

  async saveGame(game: StoredGame): Promise<void> {
    this.games.set(game.gameId, game);
  }

  async getGame(gameId: string): Promise<StoredGame | null> {
    return this.games.get(gameId) ?? null;
  }

  async saveSummary(summary: GameSummary): Promise<void> {
    this.summaries.unshift(summary);
  }

  async listSummaries(limit: number): Promise<GameSummary[]> {
    return this.summaries.slice(0, limit);
  }

  async getProcessedAction(
    gameId: string,
    actionId: string,
  ): Promise<StoredAction | null> {
    return this.games.get(gameId)?.processedActions.get(actionId) ?? null;
  }
}
