/**
 * Quintara client/server protocol types.
 *
 * The server is authoritative (§28, §139): clients send intents
 * (GameCommand with actionId + expectedVersion), never direct mutations.
 * All state sent to clients is viewer-projected (§88).
 */

import type {
  GameCommand,
  ProjectedState,
  ProjectedEvent,
  GameState,
} from "@quintara/game-engine";

// ---------------------------------------------------------------------------
// Identity & rooms
// ---------------------------------------------------------------------------

export interface PlayerIdentity {
  readonly playerId: string;
  readonly displayName: string;
  readonly isGuest: boolean;
  /** Server-issued auth token (HMAC-signed). */
  readonly token: string;
}

export type ConnectionStatus =
  | "CONNECTED"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "FORFEITED";

export type GameMode =
  | "SOLO"
  | "LOCAL"
  | "PRIVATE"
  | "QUICK_MATCH"
  | "RANKED";

export type AiDifficulty = "EASY" | "MEDIUM" | "HARD" | "EXPERT";

export interface RoomOptions {
  readonly playerCount: number;
  readonly teamSizes: number[];
  readonly requiredSequences: number | null;
  readonly turnDurationMs: number | null;
  readonly isPublic: boolean;
  readonly password: string | null;
  readonly aiSeats: number;
  readonly aiDifficulty: AiDifficulty;
}

export interface RoomPlayerInfo {
  readonly playerId: string;
  readonly displayName: string;
  readonly seat: number | null;
  readonly teamId: string | null;
  readonly connection: ConnectionStatus;
  readonly isAi: boolean;
  readonly isHost: boolean;
}

export interface RoomState {
  readonly roomId: string;
  readonly roomCode: string;
  readonly mode: GameMode;
  readonly options: RoomOptions;
  readonly players: readonly RoomPlayerInfo[];
  readonly status: "LOBBY" | "ACTIVE" | "FINISHED";
  readonly hostPlayerId: string;
}

// ---------------------------------------------------------------------------
// WebSocket protocol
// ---------------------------------------------------------------------------

/** Client → server messages. */
export type ClientMessage =
  | {
      readonly type: "AUTH";
      readonly token?: string;
      readonly displayName?: string;
    }
  | {
      readonly type: "CREATE_ROOM";
      readonly requestId: string;
      readonly mode: GameMode;
      readonly options: Partial<RoomOptions>;
    }
  | {
      readonly type: "JOIN_ROOM";
      readonly requestId: string;
      readonly roomCode: string;
      readonly password?: string;
    }
  | {
      readonly type: "JOIN_QUICK_MATCH";
      readonly requestId: string;
    }
  | { readonly type: "LEAVE_ROOM"; readonly requestId: string }
  | {
      readonly type: "START_GAME";
      readonly requestId: string;
    }
  | {
      readonly type: "GAME_COMMAND";
      readonly requestId: string;
      readonly roomActionId: string;
      readonly command: Omit<GameCommand, "playerId">;
    }
  | {
      readonly type: "RESYNC";
      readonly requestId: string;
    }
  | {
      readonly type: "REMATCH";
      readonly requestId: string;
    }
  | { readonly type: "PING"; readonly t: number };

/** Server → client messages. */
export type ServerMessage =
  | {
      readonly type: "WELCOME";
      readonly identity: PlayerIdentity;
    }
  | {
      readonly type: "ROOM_STATE";
      readonly room: RoomState;
    }
  | {
      readonly type: "GAME_STATE";
      readonly state: ProjectedState;
    }
  | {
      readonly type: "GAME_EVENTS";
      readonly events: ProjectedEvent[];
      readonly version: number;
    }
  | {
      readonly type: "ACTION_RESULT";
      readonly requestId: string;
      readonly ok: boolean;
      readonly errorCode?: string;
      readonly errorMessage?: string;
      readonly version?: number;
    }
  | {
      readonly type: "ERROR";
      readonly requestId?: string;
      readonly code: string;
      readonly message: string;
    }
  | {
      readonly type: "MATCHMAKING_STATUS";
      readonly queued: boolean;
      readonly estimatedWaitMs: number | null;
    }
  | { readonly type: "PONG"; readonly t: number };

// ---------------------------------------------------------------------------
// REST payloads (rooms, auth, history)
// ---------------------------------------------------------------------------

export interface CreateRoomRequest {
  readonly displayName?: string;
  readonly mode: GameMode;
  readonly options: Partial<RoomOptions>;
}

export interface JoinRoomRequest {
  readonly roomCode: string;
  readonly displayName?: string;
  readonly password?: string;
}

export interface GameSummary {
  readonly gameId: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly totalTurns: number;
  readonly winnerTeamId: string | null;
  readonly resultType: "WIN" | "STALEMATE";
  readonly players: readonly {
    readonly playerId: string;
    readonly displayName: string;
    readonly teamId: string;
    readonly sequences: number;
  }[];
}

export interface GameReplay {
  readonly initialSeed: string;
  readonly rulesVersion: string;
  readonly commands: readonly (Omit<GameCommand, "playerId"> & {
    readonly playerId: string;
  })[];
  readonly events: readonly (GameState | never)[] | null;
}
