/**
 * WebSocket transport (§28, §30, §74).
 *
 * Clients send intents only. The transport binds identity from the
 * authenticated session — never from the message payload (§139) — and relays
 * viewer-projected state exclusively.
 */

import type { FastifyInstance, FastifyRequest } from "fastify";
import websocketPlugin from "@fastify/websocket";
import type { WebSocket } from "ws";
import type {
  ClientMessage,
  GameMode,
  RoomOptionsInput,
  ServerMessage,
} from "@quintara/shared-types";
import {
  createGuest,
  issueToken,
  sanitiseDisplayName,
  verifyToken,
  type TokenPayload,
} from "./auth.js";
import { RoomLimitError, type SessionManager } from "./session.js";

interface Connection {
  socket: WebSocket;
  identity: TokenPayload;
}

const MAX_CONNECTIONS_PER_IP = 10;
const MAX_MESSAGES_PER_10S = 120;
const MAX_ROOM_CREATIONS_PER_MINUTE = 10;
const MAX_JOIN_ATTEMPTS_PER_MINUTE = 20;
const MAX_FRAME_BYTES = 256 * 1024;
const MAX_BUFFERED_BYTES = 1024 * 1024;
const HEARTBEAT_MS = 30_000;

const GAME_MODES: readonly GameMode[] = [
  "SOLO",
  "LOCAL",
  "PRIVATE",
  "QUICK_MATCH",
  "RANKED",
];

export async function registerWebSocket(
  app: FastifyInstance,
  sessions: SessionManager,
): Promise<void> {
  await app.register(websocketPlugin, {
    options: { maxPayload: MAX_FRAME_BYTES },
  });

  const connections = new Map<string, Set<Connection>>();
  const openSockets = new Set<WebSocket>();
  const connectionsByIp = new Map<string, number>();
  const alive = new WeakMap<WebSocket, boolean>();

  sessions.attachSink({
    send(playerId, message) {
      for (const connection of connections.get(playerId) ?? []) {
        safeSend(connection.socket, message);
      }
    },
    broadcastRoom(roomId, message) {
      const room = sessions.getRoom(roomId);
      if (!room) return;
      for (const player of room.players) {
        for (const connection of connections.get(player.playerId) ?? []) {
          safeSend(connection.socket, message);
        }
      }
      for (const spectator of room.spectators) {
        for (const connection of connections.get(spectator) ?? []) {
          safeSend(connection.socket, message);
        }
      }
    },
  });

  app.get(
    "/ws",
    { websocket: true },
    (socket: WebSocket, request: FastifyRequest) => {
      const ip = request.ip || "unknown";
      const ipCount = connectionsByIp.get(ip) ?? 0;
      if (ipCount >= MAX_CONNECTIONS_PER_IP) {
        safeSend(socket, {
          type: "ERROR",
          code: "RATE_LIMITED",
          message: "Too many connections from this address.",
        });
        socket.close(1013, "Too many connections");
        return;
      }
      connectionsByIp.set(ip, ipCount + 1);
      openSockets.add(socket);
      alive.set(socket, true);

      let connection: Connection | null = null;
      let windowStart = Date.now();
      let messageCount = 0;
      const roomCreations: number[] = [];
      const joinAttempts: number[] = [];

      socket.on("pong", () => alive.set(socket, true));
      socket.on("error", () => {
        // The close handler performs all bookkeeping.
      });

      socket.on("message", (raw: Buffer) => {
        const now = Date.now();
        if (now - windowStart > 10_000) {
          windowStart = now;
          messageCount = 0;
        }
        messageCount += 1;
        if (messageCount > MAX_MESSAGES_PER_10S) {
          safeSend(socket, {
            type: "ERROR",
            code: "RATE_LIMITED",
            message: "Too many messages. Slow down.",
          });
          return;
        }
        if (raw.length > MAX_FRAME_BYTES) {
          safeSend(socket, {
            type: "ERROR",
            code: "BAD_MESSAGE",
            message: "Message is too large.",
          });
          return;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw.toString("utf8"));
        } catch {
          safeSend(socket, {
            type: "ERROR",
            code: "BAD_MESSAGE",
            message: "Could not read that message.",
          });
          return;
        }
        if (!isRecord(parsed) || typeof parsed.type !== "string") {
          safeSend(socket, {
            type: "ERROR",
            code: "BAD_MESSAGE",
            message: "Could not read that message.",
          });
          return;
        }
        const message = parsed as ClientMessage;

        try {
          switch (message.type) {
            case "AUTH": {
              if (connection) {
                // Identity is bound once per socket: a second AUTH frame must
                // never re-bind the seat mid-connection (§139).
                safeSend(socket, {
                  type: "ERROR",
                  code: "BAD_MESSAGE",
                  message: "Already authenticated.",
                });
                break;
              }
              if (
                message.token !== undefined &&
                (typeof message.token !== "string" ||
                  message.token.length > 4096)
              ) {
                badMessage(socket, "Invalid token.");
                break;
              }
              if (
                message.displayName !== undefined &&
                typeof message.displayName !== "string"
              ) {
                badMessage(socket, "Invalid display name.");
                break;
              }
              let identity: TokenPayload;
              try {
                identity = authenticate(message.token, message.displayName);
              } catch {
                safeSend(socket, {
                  type: "ERROR",
                  code: "UNAUTHENTICATED",
                  message:
                    "Your session has expired. Reconnect to continue as a guest.",
                });
                break;
              }
              connection = { socket, identity };
              let set = connections.get(identity.playerId);
              if (!set) {
                set = new Set();
                connections.set(identity.playerId, set);
              }
              set.add(connection);
              sessions.setConnection(identity.playerId, true);
              safeSend(socket, {
                type: "WELCOME",
                identity: {
                  playerId: identity.playerId,
                  displayName: identity.displayName,
                  isGuest: identity.playerId.startsWith("guest-"),
                  token: issueToken(identity.playerId, identity.displayName),
                },
              });
              // Reconnecting players immediately receive authoritative state (§30).
              const room = sessions.getRoomForPlayer(identity.playerId);
              if (room) {
                sessions.resync(room.id, identity.playerId);
              }
              break;
            }

            case "CREATE_ROOM": {
              const identity = requireIdentity(connection, socket);
              if (!identity) return;
              if (!validRequestId(message.requestId)) {
                badMessage(socket, "Missing request id.");
                break;
              }
              if (
                typeof message.mode !== "string" ||
                !GAME_MODES.includes(message.mode)
              ) {
                badMessage(socket, "Unknown game mode.");
                break;
              }
              if (
                message.options !== undefined &&
                !isRecord(message.options)
              ) {
                badMessage(socket, "Invalid room options.");
                break;
              }
              if (!allow(roomCreations, MAX_ROOM_CREATIONS_PER_MINUTE)) {
                rateLimited(socket, "Too many rooms created. Wait a minute.");
                break;
              }
              try {
                const room = sessions.createRoom(
                  identity.playerId,
                  identity.displayName,
                  message.mode,
                  (message.options ?? {}) as RoomOptionsInput,
                  true,
                );
                safeSend(socket, {
                  type: "ACTION_RESULT",
                  requestId: message.requestId,
                  ok: true,
                });
                safeSend(socket, { type: "ROOM_STATE", room });
              } catch (error) {
                if (error instanceof RoomLimitError) {
                  rateLimited(socket, error.message);
                } else {
                  throw error;
                }
              }
              break;
            }

            case "JOIN_ROOM": {
              const identity = requireIdentity(connection, socket);
              if (!identity) return;
              if (!validRequestId(message.requestId)) {
                badMessage(socket, "Missing request id.");
                break;
              }
              if (
                typeof message.roomCode !== "string" ||
                message.roomCode.trim().length === 0 ||
                message.roomCode.length > 16
              ) {
                badMessage(socket, "Invalid room code.");
                break;
              }
              if (
                message.password !== undefined &&
                typeof message.password !== "string"
              ) {
                badMessage(socket, "Invalid room password.");
                break;
              }
              if (!allow(joinAttempts, MAX_JOIN_ATTEMPTS_PER_MINUTE)) {
                rateLimited(socket, "Too many join attempts. Wait a minute.");
                break;
              }
              const result = sessions.joinRoom(
                identity.playerId,
                identity.displayName,
                message.roomCode,
                message.password,
                true,
              );
              if (result.error) {
                safeSend(socket, {
                  type: "ACTION_RESULT",
                  requestId: message.requestId,
                  ok: false,
                  errorMessage: result.error,
                });
              } else {
                safeSend(socket, {
                  type: "ACTION_RESULT",
                  requestId: message.requestId,
                  ok: true,
                });
                // Full authoritative state on join/reconnect (§92).
                const room = sessions.getRoomForPlayer(identity.playerId);
                if (room) sessions.resync(room.id, identity.playerId);
              }
              break;
            }

            case "JOIN_QUICK_MATCH": {
              const identity = requireIdentity(connection, socket);
              if (!identity) return;
              if (!validRequestId(message.requestId)) {
                badMessage(socket, "Missing request id.");
                break;
              }
              sessions.joinQuickMatch(
                identity.playerId,
                identity.displayName,
              );
              break;
            }

            case "LEAVE_ROOM": {
              const identity = requireIdentity(connection, socket);
              if (!identity) return;
              if (!validRequestId(message.requestId)) {
                badMessage(socket, "Missing request id.");
                break;
              }
              sessions.leaveRoom(identity.playerId);
              safeSend(socket, {
                type: "ACTION_RESULT",
                requestId: message.requestId,
                ok: true,
              });
              break;
            }

            case "START_GAME": {
              const identity = requireIdentity(connection, socket);
              if (!identity) return;
              if (!validRequestId(message.requestId)) {
                badMessage(socket, "Missing request id.");
                break;
              }
              const room = sessions.getRoomForPlayer(identity.playerId);
              if (!room) return;
              const result = sessions.startGame(room.id, identity.playerId);
              safeSend(socket, {
                type: "ACTION_RESULT",
                requestId: message.requestId,
                ok: !result.error,
                errorMessage: result.error,
              });
              break;
            }

            case "GAME_COMMAND": {
              const identity = requireIdentity(connection, socket);
              if (!identity) return;
              if (!validRequestId(message.requestId)) {
                badMessage(socket, "Missing request id.");
                break;
              }
              const room = sessions.getRoomForPlayer(identity.playerId);
              if (!room) return;
              if (
                !isRecord(message.command) ||
                !Number.isInteger(message.command.expectedVersion) ||
                !validRequestId(message.command.actionId)
              ) {
                badMessage(
                  socket,
                  "Commands must include actionId and expectedVersion.",
                );
                break;
              }
              const result = sessions.submitCommand(
                room.id,
                identity.playerId,
                message.command,
                message.requestId,
              );
              safeSend(socket, {
                type: "ACTION_RESULT",
                requestId: message.requestId,
                ok: result.ok,
                version: result.version,
                errorCode: result.errorCode,
                errorMessage: result.errorMessage,
              });
              // A stale client must recover the authoritative projection
              // immediately, not wait for the next unrelated broadcast (§80).
              if (
                (result.ok && result.duplicate) ||
                result.errorCode === "STALE_GAME_STATE"
              ) {
                sessions.resync(room.id, identity.playerId);
              }
              break;
            }

            case "RESYNC": {
              const identity = requireIdentity(connection, socket);
              if (!identity) return;
              if (!validRequestId(message.requestId)) {
                badMessage(socket, "Missing request id.");
                break;
              }
              const room = sessions.getRoomForPlayer(identity.playerId);
              if (room) sessions.resync(room.id, identity.playerId);
              safeSend(socket, {
                type: "ACTION_RESULT",
                requestId: message.requestId,
                ok: true,
              });
              break;
            }

            case "REMATCH": {
              const identity = requireIdentity(connection, socket);
              if (!identity) return;
              if (!validRequestId(message.requestId)) {
                badMessage(socket, "Missing request id.");
                break;
              }
              const room = sessions.getRoomForPlayer(identity.playerId);
              const result = room
                ? sessions.rematch(room.id, identity.playerId)
                : { error: "You are not in a room." };
              safeSend(socket, {
                type: "ACTION_RESULT",
                requestId: message.requestId,
                ok: result.ok === true,
                errorMessage: result.ok === true ? undefined : result.error,
              });
              break;
            }

            case "PING":
              if (typeof message.t !== "number" || !Number.isFinite(message.t)) {
                badMessage(socket, "Invalid ping.");
                break;
              }
              safeSend(socket, { type: "PONG", t: message.t });
              break;

            default:
              badMessage(socket, "Unknown message type.");
              break;
          }
        } catch (error) {
          app.log.error(error);
          safeSend(socket, {
            type: "ERROR",
            code: "INTERNAL",
            message: "Something went wrong.",
          });
        }
      });

      socket.on("close", () => {
        openSockets.delete(socket);
        alive.delete(socket);
        const remaining = (connectionsByIp.get(ip) ?? 1) - 1;
        if (remaining <= 0) connectionsByIp.delete(ip);
        else connectionsByIp.set(ip, remaining);

        if (!connection) return;
        const { identity } = connection;
        const set = connections.get(identity.playerId);
        if (!set) return;
        set.delete(connection);
        if (set.size === 0) {
          connections.delete(identity.playerId);
          sessions.setConnection(identity.playerId, false);
        }
      });
    },
  );

  const heartbeat = setInterval(() => {
    for (const socket of openSockets) {
      if (!alive.get(socket)) {
        socket.terminate();
        continue;
      }
      alive.set(socket, false);
      try {
        socket.ping();
      } catch {
        socket.terminate();
      }
    }
  }, HEARTBEAT_MS);
  heartbeat.unref?.();

  app.addHook("onClose", async () => {
    clearInterval(heartbeat);
    for (const socket of openSockets) socket.terminate();
    openSockets.clear();
  });
}

function authenticate(token?: string, displayName?: string): TokenPayload {
  if (token) {
    const payload = verifyToken(token);
    if (!payload) throw new Error("Invalid or expired token");
    return payload;
  }
  return createGuest(sanitiseDisplayName(displayName));
}

function requireIdentity(
  connection: Connection | null,
  socket: WebSocket,
): TokenPayload | null {
  if (!connection) {
    safeSend(socket, {
      type: "ERROR",
      code: "UNAUTHENTICATED",
      message: "Authenticate first.",
    });
    return null;
  }
  return connection.identity;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validRequestId(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= 128
  );
}

/** Sliding-window limiter; prunes entries older than one minute. */
function allow(timestamps: number[], maxPerMinute: number): boolean {
  const now = Date.now();
  while (timestamps.length > 0 && now - (timestamps[0] as number) > 60_000) {
    timestamps.shift();
  }
  if (timestamps.length >= maxPerMinute) return false;
  timestamps.push(now);
  return true;
}

function badMessage(socket: WebSocket, message: string): void {
  safeSend(socket, { type: "ERROR", code: "BAD_MESSAGE", message });
}

function rateLimited(socket: WebSocket, message: string): void {
  safeSend(socket, { type: "ERROR", code: "RATE_LIMITED", message });
}

function safeSend(socket: WebSocket, message: ServerMessage): void {
  try {
    if (socket.readyState !== 1) return;
    // A client that stops reading must not grow the server's send buffer
    // without bound.
    if (socket.bufferedAmount > MAX_BUFFERED_BYTES) {
      socket.terminate();
      return;
    }
    socket.send(JSON.stringify(message));
  } catch {
    // Connection dropped mid-send; reconnect flow recovers state.
  }
}
