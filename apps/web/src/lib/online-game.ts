/**
 * Online multiplayer client (§28–§30).
 *
 * Sends intents (commands with actionId + expectedVersion) and renders
 * server-provided viewer projections. Never derives game state locally: the
 * server is authoritative (§30). Reconnect restores state via RESYNC.
 */

"use client";

import { create } from "zustand";
import type {
  ClientGameCommand,
  ClientMessage,
  RoomState,
  ServerMessage,
} from "@quintara/shared-types";
import type { ProjectedState, SequenceCandidate } from "@quintara/game-engine";
import { engineErrorMessage, type EngineErrorCode } from "@quintara/game-engine";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline";

type Phase = "HOME" | "LOBBY" | "PLAYING";

interface OnlineGameState {
  connection: ConnectionStatus;
  phase: Phase;
  identity: { playerId: string; displayName: string; token: string } | null;
  room: RoomState | null;
  projected: ProjectedState | null;
  version: number;
  selectedCardId: string | null;
  lastMoveSummary: string | null;
  errorMessage: string | null;
  matchmaking: boolean;

  connect: () => void;
  disconnect: () => void;
  createRoom: (options: {
    playerCount: number;
    aiSeats: number;
    aiDifficulty: string;
  }) => void;
  joinRoom: (roomCode: string, password?: string) => void;
  quickMatch: () => void;
  cancelQuickMatch: () => void;
  startGame: () => void;
  leaveRoom: () => void;
  rematch: () => void;
  selectCard: (cardId: string | null) => void;
  sendCommand: (command: ClientGameCommand) => void;
  selectSequences: (sequences: SequenceCandidate[]) => void;
  clearError: () => void;
}

let socket: WebSocket | null = null;
let requestCounter = 0;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pendingToken: string | null = null;

function wsUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL;
  if (configured) return configured;
  if (typeof window === "undefined") return "ws://localhost:4000/ws";
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.host}/ws`;
}

function request(): string {
  return `req-${++requestCounter}-${Date.now()}`;
}

export const useOnlineGame = create<OnlineGameState>((set, get) => {
  function send(message: ClientMessage): void {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  function handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case "WELCOME":
        set({
          identity: {
            playerId: message.identity.playerId,
            displayName: message.identity.displayName,
            token: message.identity.token,
          },
          connection: "connected",
        });
        try {
          window.localStorage.setItem("quintara-auth", message.identity.token);
        } catch {
          // Storage unavailable — token stays in memory.
        }
        break;

      case "ROOM_STATE":
        set({
          room: message.room,
          phase: message.room.status === "LOBBY" ? "LOBBY" : "PLAYING",
        });
        break;

      case "GAME_STATE":
        set({
          projected: message.state,
          version: message.state.version,
          phase: "PLAYING",
        });
        break;

      case "GAME_EVENTS": {
        const summaries: string[] = [];
        for (const event of message.events) {
          switch (event.type) {
            case "MARKER_PLACED":
              summaries.push("Marker placed");
              break;
            case "MARKER_REMOVED":
              summaries.push("Marker removed");
              break;
            case "SEQUENCE_COMPLETED":
              summaries.push("Line completed!");
              break;
            case "DEAD_CARD_EXCHANGED":
              summaries.push("Dead card exchanged");
              break;
            case "TURN_SKIPPED_NO_LEGAL_ACTION":
              summaries.push("Turn skipped — no legal moves");
              break;
            case "GAME_WON":
              summaries.push("Game over!");
              break;
          }
        }
        if (summaries.length > 0) {
          set({ lastMoveSummary: summaries.join(" · ") });
        }
        break;
      }

      case "ACTION_RESULT":
        if (!message.ok) {
          const code = message.errorCode as EngineErrorCode | undefined;
          set({
            errorMessage: message.errorMessage
              ? message.errorMessage
              : code
                ? engineErrorMessage(code)
                : "That move was rejected.",
          });
        }
        break;

      case "MATCHMAKING_STATUS":
        set({ matchmaking: message.queued });
        break;

      case "ERROR":
        set({ errorMessage: message.message });
        break;

      case "PONG":
        break;
    }
  }

  function connect(): void {
    if (socket && socket.readyState <= WebSocket.OPEN) return;
    set({
      connection: get().connection === "idle" ? "connecting" : "reconnecting",
    });

    socket = new WebSocket(wsUrl());

    socket.onopen = () => {
      reconnectAttempts = 0;
      const token =
        pendingToken ??
        (typeof window !== "undefined"
          ? window.localStorage.getItem("quintara-auth")
          : null);
      send({ type: "AUTH", token: token ?? undefined });
      // Recover in-flight games after a reconnect (§30).
      if (get().room) {
        send({ type: "RESYNC", requestId: request() });
      }
    };

    socket.onmessage = (event) => {
      try {
        handleMessage(JSON.parse(event.data as string) as ServerMessage);
      } catch {
        // Ignore malformed frames.
      }
    };

    socket.onclose = () => {
      socket = null;
      if (get().connection === "idle") return;
      // §30: "Connection lost / Reconnecting…" — never eject immediately.
      set({ connection: "reconnecting" });
      if (reconnectTimer) clearTimeout(reconnectTimer);
      const delay = Math.min(8000, 500 * 2 ** reconnectAttempts);
      reconnectAttempts += 1;
      reconnectTimer = setTimeout(() => connect(), delay);
    };

    socket.onerror = () => {
      // onclose follows and drives reconnection.
    };
  }

  return {
    connection: "idle",
    phase: "HOME",
    identity: null,
    room: null,
    projected: null,
    version: 0,
    selectedCardId: null,
    lastMoveSummary: null,
    errorMessage: null,
    matchmaking: false,

    connect,
    disconnect: () => {
      set({ connection: "idle", phase: "HOME", room: null, projected: null });
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
      socket = null;
    },

    createRoom: ({ playerCount, aiSeats, aiDifficulty }) => {
      send({
        type: "CREATE_ROOM",
        requestId: request(),
        mode: aiSeats > 0 ? "SOLO" : "PRIVATE",
        options: {
          playerCount,
          aiSeats,
          aiDifficulty: aiDifficulty as never,
          isPublic: false,
        },
      });
    },

    joinRoom: (roomCode, password) => {
      send({
        type: "JOIN_ROOM",
        requestId: request(),
        roomCode,
        password,
      });
    },

    quickMatch: () => {
      set({ matchmaking: true });
      send({ type: "JOIN_QUICK_MATCH", requestId: request() });
    },

    cancelQuickMatch: () => {
      send({ type: "LEAVE_ROOM", requestId: request() });
      set({ matchmaking: false });
    },

    startGame: () => {
      send({ type: "START_GAME", requestId: request() });
    },

    leaveRoom: () => {
      send({ type: "LEAVE_ROOM", requestId: request() });
      set({ phase: "HOME", room: null, projected: null });
    },

    rematch: () => {
      send({ type: "REMATCH", requestId: request() });
    },

    selectCard: (cardId) => {
      set({ selectedCardId: get().selectedCardId === cardId ? null : cardId });
    },

    sendCommand: (command) => {
      send({
        type: "GAME_COMMAND",
        requestId: request(),
        roomActionId: command.actionId,
        command,
      });
      set({ selectedCardId: null });
    },

    selectSequences: (sequences) => {
      const { projected, sendCommand } = get();
      if (!projected) return;
      sendCommand({
        type: "SELECT_SEQUENCE_SET",
        actionId: `web-${Date.now()}`,
        expectedVersion: projected.version,
        sequenceCellSets: sequences.map((s) => [...s.cells]),
      });
    },

    clearError: () => set({ errorMessage: null }),
  };
});

export function rememberToken(token: string): void {
  pendingToken = token;
}
