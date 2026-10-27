/**
 * Quintara authoritative game server entry point.
 *
 * HTTP: health, room management, history and replays.
 * WebSocket: realtime game transport (see ws.ts).
 */

import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { registerWebSocket } from "./ws.js";
import { SessionManager } from "./session.js";
import type { CreateRoomRequest, JoinRoomRequest } from "@quintara/shared-types";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? true;

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  const sessions = new SessionManager();

  await app.register(cors, {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  });

  await registerWebSocket(app, sessions);

  app.get("/api/health", async () => ({
    ok: true,
    service: "quintara-server",
    time: new Date().toISOString(),
  }));

  app.post<{ Body: CreateRoomRequest }>("/api/rooms", async (request, reply) => {
    const body = request.body;
    if (!body || typeof body !== "object") {
      return reply.code(400).send({ error: "Invalid request." });
    }
    // REST room creation issues a guest identity for convenience; the same
    // token is then used over the WebSocket.
    const { createGuest, issueToken } = await import("./auth.js");
    const identity = createGuest(body.displayName);
    const room = sessions.createRoom(
      identity.playerId,
      identity.displayName,
      body.mode,
      body.options,
    );
    return {
      room,
      identity: {
        playerId: identity.playerId,
        displayName: identity.displayName,
        token: issueToken(identity.playerId, identity.displayName),
      },
    };
  });

  app.post<{ Body: JoinRoomRequest }>("/api/rooms/join", async (request, reply) => {
    const body = request.body;
    if (!body?.roomCode) {
      return reply.code(400).send({ error: "roomCode is required." });
    }
    const { createGuest, issueToken } = await import("./auth.js");
    const identity = createGuest(body.displayName);
    const result = sessions.joinRoom(
      identity.playerId,
      identity.displayName,
      body.roomCode,
      body.password,
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
  });

  app.get("/api/history", async (request) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(100, Number(query.limit ?? 20) || 20);
    return { games: await sessions.listHistory(limit) };
  });

  app.get<{ Params: { gameId: string } }>(
    "/api/games/:gameId/replay",
    async (request, reply) => {
      const game = await sessions.getReplay(request.params.gameId);
      if (!game) return reply.code(404).send({ error: "Game not found." });
      // Public audit payload: replaying the recorded command stream only
      // requires the seat ids players were assigned; never broadcast
      // credentials, per-player identity or tokens here.
      return {
        gameId: game.gameId,
        rulesVersion: game.currentState.rulesVersion,
        rngAlgorithmVersion: game.currentState.rngVersion,
        seatPlayerIds: game.currentState.players.map((p) => p.id),
        commands: game.commands.map((command) => ({
          ...command,
          playerId: "*",
        })),
        events: game.events.map((event) => ({ type: event.type })),
        summary: game.summary,
      };
    },
  );

  return app;
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const app = await buildServer();
  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}
