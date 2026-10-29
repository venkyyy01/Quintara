import { describe, expect, it } from "vitest";
import type { GameSummary } from "@quintara/shared-types";
import { InMemoryGameStore } from "../src/store.js";

function summary(gameId: string, isPublic: boolean): GameSummary {
  return {
    gameId,
    finishedAt: "2026-10-28T12:00:00.000Z",
    durationMs: 60_000,
    totalTurns: 20,
    winnerTeamId: "team-1",
    resultType: "WIN",
    isPublic,
    players: [
      {
        playerId: "p-1",
        displayName: "Alice",
        teamId: "team-1",
        sequences: 2,
      },
    ],
  };
}

describe("history visibility", () => {
  it("only lists public-room summaries in the public feed", async () => {
    const store = new InMemoryGameStore();
    await store.saveSummary(summary("private-1", false));
    await store.saveSummary(summary("public-1", true));
    await store.saveSummary(summary("private-2", false));

    const publicOnly = await store.listSummaries(10, { publicOnly: true });
    expect(publicOnly.map((entry) => entry.gameId)).toEqual(["public-1"]);

    const all = await store.listSummaries(10);
    expect(all.map((entry) => entry.gameId)).toEqual([
      "private-2",
      "public-1",
      "private-1",
    ]);
  });

  it("still bounds the requested page size", async () => {
    const store = new InMemoryGameStore();
    for (let index = 0; index < 5; index += 1) {
      await store.saveSummary(summary(`public-${index}`, true));
    }
    const page = await store.listSummaries(2, { publicOnly: true });
    expect(page).toHaveLength(2);
    expect(page[0]?.gameId).toBe("public-4");
  });
});
