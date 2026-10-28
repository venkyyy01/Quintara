/**
 * Quintara authoritative game server entry point.
 *
 * HTTP: health, room management, history and replays.
 * WebSocket: realtime game transport (see ws.ts).
 */

import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import cors from "@fastify/cors";
import { pathToFileURL } from "node:url";
import { registerWebSocket } from "./ws.js";
import { buildAuthoritativeCommand, RoomLimitError, SessionManager } from "./session.js";
import type {
  CreateRoomRequest,
  GameMode,
  JoinRoomRequest,
} from "@quintara/shared-types";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
const GAME_MODES: readonly GameMode[] = [
  "SOLO",
  "LOCAL",
  "PRIVATE",
  "QUICK_MATCH",
  "RANKED",
];

const httpAttempts = new Map<string, number[]>();

function allowHttp(ip: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const attempts = (httpAttempts.get(ip) ?? []).filter(
    (timestamp) => now - timestamp < 60_000,
  );
  if (attempts.length >= maxPerMinute) {
    httpAttempts.set(ip, attempts);
    return false;
  }
  attempts.push(now);
  httpAttempts.set(ip, attempts);
  if (httpAttempts.size > 10_000) {
    for (const [key, value] of httpAttempts) {
      if (value.every((timestamp) => now - timestamp >= 60_000)) {
        httpAttempts.delete(key);
      }
    }
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGameMode(value: unknown): value is GameMode {
  return typeof value === "string" && GAME_MODES.includes(value as GameMode);
}

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
    bodyLimit: 64 * 1024,
  });
  const sessions = new SessionManager();

  await app.register(cors, {
    origin:
      CORS_ORIGIN === "true"
        ? true
        : CORS_ORIGIN.split(",")
            .map((origin) => origin.trim())
            .filter(Boolean),
    methods: ["GET", "POST"],
  });

  app.addHook(
    "onSend",
    async (
      _request: FastifyRequest,
      reply: FastifyReply,
      payload: unknown,
    ) => {
      reply.header("X-Content-Type-Options", "nosniff");
      reply.header("X-Frame-Options", "DENY");
      reply.header("Referrer-Policy", "no-referrer");
      reply.header("Cross-Origin-Opener-Policy", "same-origin");
      reply.header(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()",
      );
      return payload;
    },
  );

  await registerWebSocket(app, sessions);

  app.get("/api/health", async () => ({
    ok: true,
    service: "quintara-server",
    time: new Date().toISOString(),
  }));

  app.post<{ Body: CreateRoomRequest }>("/api/rooms", async (request, reply) => {
    if (!allowHttp(request.ip, 20)) {
      return reply.code(429).send({ error: "Too many requests. Wait a minute." });
    }
    const body: unknown = request.body;
    if (!isRecord(body)) {
      return reply.code(400).send({ error: "Invalid request." });
    }
    if (body.options !== undefined && !isRecord(body.options)) {
      return reply.code(400).send({ error: "Invalid room options." });
    }
    if (!isGameMode(body.mode)) {
      return reply.code(400).send({ error: "Unknown game mode." });
    }
    if (
      body.displayName !== undefined &&
      typeof body.displayName !== "string"
    ) {
      return reply.code(400).send({ error: "Invalid display name." });
    }

    // REST room creation issues a guest identity for convenience; the same
    // token is then used over the WebSocket. The host is marked RECONNECTING
    // until that socket authenticates, so a REST phantom cannot hold a seat
    // forever.
    const { createGuest, issueToken } = await import("./auth.js");
    const identity = createGuest(
      typeof body.displayName === "string" ? body.displayName : undefined,
    );
    try {
      const room = sessions.createRoom(
        identity.playerId,
        identity.displayName,
        body.mode,
        isRecord(body.options) ? body.options : {},
        false,
      );
      return {
        room,
        identity: {
          playerId: identity.playerId,
          displayName: identity.displayName,
          token: issueToken(identity.playerId, identity.displayName),
        },
      };
    } catch (error) {
      if (error instanceof RoomLimitError) {
        return reply.code(429).send({ error: error.message });
      }
      throw error;
    }
  });

  app.post<{ Body: JoinRoomRequest }>(
    "/api/rooms/join",
    async (request, reply) => {
      if (!allowHttp(request.ip, 30)) {
        return reply
          .code(429)
          .send({ error: "Too many requests. Wait a minute." });
      }
      const body: unknown = request.body;
      if (!isRecord(body) || typeof body.roomCode !== "string") {
        return reply.code(400).send({ error: "roomCode is required." });
      }
      if (body.roomCode.trim().length === 0 || body.roomCode.length > 16) {
        return reply.code(400).send({ error: "Invalid room code." });
      }
      if (
        body.password !== undefined &&
        typeof body.password !== "string"
      ) {
        return reply.code(400).send({ error: "Invalid room password." });
      }
      if (
        body.displayName !== undefined &&
        typeof body.displayName !== "string"
      ) {
        return reply.code(400).send({ error: "Invalid display name." });
      }

      const { createGuest, issueToken } = await import("./auth.js");
      const identity = createGuest(
        typeof body.displayName === "string" ? body.displayName : undefined,
      );
      const result = sessions.joinRoom(
        identity.playerId,
        identity.displayName,
        body.roomCode,
        typeof body.password === "string" ? body.password : undefined,
        false,
      );
      if (result.error) return reply.code(404).send({ error: result.error });
      return {
        room: result.room,
        identity: {
          playerId: identity.playerId,
          displayName: identity.displayName,
          token: issueToken(identity.playerId, identity.displayName),
        },
      };
    },
  );

  app.get("/api/history", async (request) => {
    const query = request.query as { limit?: string };
    const parsed = Number(query.limit ?? 20);
    const limit = Number.isFinite(parsed)
      ? Math.min(100, Math.max(1, Math.trunc(parsed)))
      : 20;
    return { games: await sessions.listHistory(limit) };
  });

  app.get<{ Params: { gameId: string } }>(
    "/api/games/:gameId/replay",
    async (request, reply) => {
      const game = await sessions.getReplay(request.params.gameId);
      if (!game || !game.summary) {
        return reply.code(404).send({ error: "Finished game not found." });
      }
      // Rebuild each command from an explicit allowlist: stored commands may
      // predate the current schema, and clients must never be able to inject
      // arbitrary fields into this public payload.
      const commands = game.commands
        .map((command) =>
          buildAuthoritativeCommand(command, command.playerId),
        )
        .filter((command) => command !== null);
      return {
        gameId: game.gameId,
        rulesVersion: game.initialState.rulesVersion,
        rngAlgorithmVersion: game.initialState.rngVersion,
        initialState: game.initialState,
        commands,
        events: game.events.map((event) => ({ type: event.type })),
        summary: game.summary,
      };
    },
  );

  app.addHook("onClose", async () => {
    sessions.dispose();
  });

  return app;
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const app = await buildServer();
  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    app.log.info(`Received ${signal}; shutting down.`);
    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      app.log.error(error);
      process.exit(1);
    }
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}
