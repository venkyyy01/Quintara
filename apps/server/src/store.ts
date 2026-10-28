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
  /** Stable hash of the command payload; detects actionId reuse. */
  readonly fingerprint: string;
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
  deleteGame(gameId: string): Promise<void>;
  saveSummary(summary: GameSummary): Promise<void>;
  listSummaries(limit: number): Promise<GameSummary[]>;
  getProcessedAction(
    gameId: string,
    actionId: string,
  ): Promise<StoredAction | null>;
}

/** Bounds the default single-instance store so abandoned games cannot OOM. */
export const IN_MEMORY_GAME_LIMIT = 500;
export const IN_MEMORY_SUMMARY_LIMIT = 200;

export class InMemoryGameStore implements GameStore {
  private readonly games = new Map<string, StoredGame>();
  private readonly summaries: GameSummary[] = [];

  async saveGame(game: StoredGame): Promise<void> {
    // Map preserves insertion order: evict the oldest game when full.
    if (!this.games.has(game.gameId)) {
      while (this.games.size >= IN_MEMORY_GAME_LIMIT) {
        const oldest = this.games.keys().next().value;
        if (oldest === undefined) break;
        this.games.delete(oldest);
      }
    }
    this.games.set(game.gameId, game);
  }

  async getGame(gameId: string): Promise<StoredGame | null> {
    return this.games.get(gameId) ?? null;
  }

  async deleteGame(gameId: string): Promise<void> {
    this.games.delete(gameId);
  }

  async saveSummary(summary: GameSummary): Promise<void> {
    this.summaries.unshift(summary);
    if (this.summaries.length > IN_MEMORY_SUMMARY_LIMIT) {
      this.summaries.length = IN_MEMORY_SUMMARY_LIMIT;
    }
  }

  async listSummaries(limit: number): Promise<GameSummary[]> {
    const safeLimit = Number.isInteger(limit)
      ? Math.min(IN_MEMORY_SUMMARY_LIMIT, Math.max(0, limit))
      : 20;
    return this.summaries.slice(0, safeLimit);
  }

  async getProcessedAction(
    gameId: string,
    actionId: string,
  ): Promise<StoredAction | null> {
    return this.games.get(gameId)?.processedActions.get(actionId) ?? null;
  }
}
