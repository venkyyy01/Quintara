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

/** Distributive omit that preserves union discrimination. */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** A command as sent by clients: identity is bound server-side (§139). */
export type ClientGameCommand = DistributiveOmit<GameCommand, "playerId">;

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

/**
 * Public room options. Secrets are write-only: `hasPassword` tells clients
 * whether a password is required without ever broadcasting the password.
 */
export interface RoomOptions {
  readonly playerCount: number;
  readonly teamSizes: number[];
  readonly requiredSequences: number | null;
  readonly turnDurationMs: number | null;
  readonly isPublic: boolean;
  readonly hasPassword: boolean;
  readonly aiSeats: number;
  readonly aiDifficulty: AiDifficulty;
}

/** Client-supplied room options. `password` is accepted but never echoed. */
export interface RoomOptionsInput {
  readonly playerCount?: number;
  readonly teamSizes?: number[];
  readonly requiredSequences?: number | null;
  readonly turnDurationMs?: number | null;
  readonly isPublic?: boolean;
  readonly password?: string | null;
  readonly aiSeats?: number;
  readonly aiDifficulty?: AiDifficulty;
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
      readonly options: RoomOptionsInput;
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
      readonly command: ClientGameCommand;
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
      /**
       * Absolute epoch milliseconds for the current turn's server deadline.
       * Clients render the countdown from this value so a reconnect or reload
       * cannot restart the clock.
       */
      readonly turnDeadlineAt?: number | null;
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
  readonly options: RoomOptionsInput;
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
  /** Only public-room results appear in the public history feed. */
  readonly isPublic: boolean;
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
  readonly commands: readonly (ClientGameCommand & {
    readonly playerId: string;
  })[];
  readonly events: readonly (GameState | never)[] | null;
}
