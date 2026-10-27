/**
 * WebSocket transport (§28, §30).
 *
 * Clients send intents only. The transport binds identity from the
 * authenticated session — never from the message payload (§139) — and relays
 * viewer-projected state exclusively.
 */

import type { FastifyInstance } from "fastify";
import websocketPlugin from "@fastify/websocket";
import type { WebSocket } from "ws";
import type { ClientMessage, ServerMessage } from "@quintara/shared-types";
import { createGuest, issueToken, verifyToken, type TokenPayload } from "./auth.js";
import type { SessionManager } from "./session.js";

interface Connection {
  socket: WebSocket;
  identity: TokenPayload;
}

export async function registerWebSocket(
  app: FastifyInstance,
  sessions: SessionManager,
): Promise<void> {
  await app.register(websocketPlugin, {
    options: { maxPayload: 256 * 1024 },
  });

  const connections = new Map<string, Set<Connection>>();

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

  app.get("/ws", { websocket: true }, (socket: WebSocket) => {
    let connection: Connection | null = null;

    socket.on("message", (raw: Buffer) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(raw.toString("utf8")) as ClientMessage;
      } catch {
        safeSend(socket, {
          type: "ERROR",
          code: "BAD_MESSAGE",
          message: "Could not read that message.",
        });
        return;
      }

      try {
        switch (message.type) {
          case "AUTH": {
            const identity = authenticate(message.token, message.displayName);
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
            const room = sessions.createRoom(
              identity.playerId,
              identity.displayName,
              message.mode,
              message.options,
            );
            safeSend(socket, {
              type: "ACTION_RESULT",
              requestId: message.requestId,
              ok: true,
            });
            safeSend(socket, { type: "ROOM_STATE", room });
            break;
          }

          case "JOIN_ROOM": {
            const identity = requireIdentity(connection, socket);
            if (!identity) return;
            const result = sessions.joinRoom(
              identity.playerId,
              identity.displayName,
              message.roomCode,
              message.password,
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
            sessions.joinQuickMatch(identity.playerId, identity.displayName);
            break;
          }

          case "LEAVE_ROOM": {
            const identity = requireIdentity(connection, socket);
            if (!identity) return;
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
            const room = sessions.getRoomForPlayer(identity.playerId);
            if (!room) return;
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
            // After a duplicate action, resync the requester (§93).
            if (result.ok && result.duplicate) {
              sessions.resync(room.id, identity.playerId);
            }
            break;
          }

          case "RESYNC": {
            const identity = requireIdentity(connection, socket);
            if (!identity) return;
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
            const room = sessions.getRoomForPlayer(identity.playerId);
            if (room) sessions.rematch(room.id, identity.playerId);
            safeSend(socket, {
              type: "ACTION_RESULT",
              requestId: message.requestId,
              ok: true,
            });
            break;
          }

          case "PING":
            safeSend(socket, { type: "PONG", t: message.t });
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
      if (!connection) return;
      const { identity } = connection;
      const set = connections.get(identity.playerId);
      if (set) {
        set.delete(connection);
        if (set.size === 0) {
          connections.delete(identity.playerId);
          sessions.setConnection(identity.playerId, false);
        }
      }
    });
  });
}

function authenticate(token?: string, displayName?: string): TokenPayload {
  if (token) {
    const payload = verifyToken(token);
    if (payload) return payload;
  }
  return createGuest(displayName);
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

function safeSend(socket: WebSocket, message: ServerMessage): void {
  try {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify(message));
    }
  } catch {
    // Connection dropped mid-send; reconnect flow recovers state.
  }
}
