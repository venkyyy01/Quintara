/**
 * Required player-configuration tests (§114) + setup/dealing (§21–§22)
 * + Design Plan §6, §77.
 */
import { describe, expect, it } from "vitest";
import {
  buildTurnOrder,
  createGame,
  CUSTOM_RULES_VERSION,
  isStandardPlayerCount,
  RULES_VERSION,
  standardHandSize,
  standardRequiredSequences,
  standardTeamConfigurations,
  startGame,
  STANDARD_HAND_SIZE,
  STANDARD_PLAYER_COUNTS,
  validateGameState,
  type CreateGamePlayerInput,
} from "../src/index.js";

function players(count: number): CreateGamePlayerInput[] {
  return Array.from({ length: count }, (_, i) => ({ name: `P${i + 1}` }));
}

describe("standard player counts (§114)", () => {
  it.each([2, 3, 4, 6, 8, 9, 10, 12])(
    "accepts %i players",
    (count) => {
      const state = createGame({ players: players(count) });
      expect(state.players.length).toBe(count);
    },
  );

  it.each([1, 5, 7, 11, 13])("rejects %i players in Standard mode", (count) => {
    expect(() => createGame({ players: players(count) })).toThrow();
  });

  it("verifies every standard hand size (§8)", () => {
    expect(standardHandSize(2)).toBe(7);
    expect(standardHandSize(3)).toBe(6);
    expect(standardHandSize(4)).toBe(6);
    expect(standardHandSize(6)).toBe(5);
    expect(standardHandSize(8)).toBe(4);
    expect(standardHandSize(9)).toBe(4);
    expect(standardHandSize(10)).toBe(3);
    expect(standardHandSize(12)).toBe(3);
    expect(STANDARD_HAND_SIZE).toEqual({
      2: 7,
      3: 6,
      4: 6,
      6: 5,
      8: 4,
      9: 4,
      10: 3,
      12: 3,
    });
  });

  it("rejects unsupported counts via isStandardPlayerCount", () => {
    expect(isStandardPlayerCount(5)).toBe(false);
    expect(isStandardPlayerCount(7)).toBe(false);
    expect(isStandardPlayerCount(11)).toBe(false);
    expect(isStandardPlayerCount(2)).toBe(true);
  });
});

describe("required sequences (§3)", () => {
  it("requires 2 sequences for two sides and 1 for three sides", () => {
    expect(standardRequiredSequences(2)).toBe(2);
    expect(standardRequiredSequences(3)).toBe(1);

    const twoSides = createGame({ players: players(4) }); // 2 teams
    expect(twoSides.teams.length).toBe(2);
    expect(twoSides.requiredSequences).toBe(2);

    const threeSides = createGame({
      players: players(6),
      teamSizes: [2, 2, 2],
    });
    expect(threeSides.teams.length).toBe(3);
    expect(threeSides.requiredSequences).toBe(1);
  });

  it("derives requirement from sides, not raw player count (§3)", () => {
    const individuals3 = createGame({ players: players(3) });
    expect(individuals3.teams.length).toBe(3);
    expect(individuals3.requiredSequences).toBe(1);

    const teams2 = createGame({ players: players(2) });
    expect(teams2.teams.length).toBe(2);
    expect(teams2.requiredSequences).toBe(2);
  });
});

describe("team configurations (§6)", () => {
  it("plays 2–3 players individually", () => {
    for (const count of [2, 3]) {
      const state = createGame({ players: players(count) });
      for (const team of state.teams) {
        expect(team.memberIds.length).toBe(1);
      }
    }
  });

  it("supports both 6-player configurations", () => {
    const twoBy3 = createGame({ players: players(6), teamSizes: [3, 3] });
    expect(twoBy3.teams.map((t) => t.memberIds.length)).toEqual([3, 3]);

    const threeBy2 = createGame({ players: players(6), teamSizes: [2, 2, 2] });
    expect(threeBy2.teams.map((t) => t.memberIds.length)).toEqual([2, 2, 2]);
  });

  it("supports both 12-player configurations", () => {
    const twoBy6 = createGame({ players: players(12), teamSizes: [6, 6] });
    expect(twoBy6.teams.map((t) => t.memberIds.length)).toEqual([6, 6]);
    const threeBy4 = createGame({ players: players(12), teamSizes: [4, 4, 4] });
    expect(threeBy4.teams.map((t) => t.memberIds.length)).toEqual([4, 4, 4]);
  });

  it("rejects team sizes that do not match the player count", () => {
    expect(() =>
      createGame({ players: players(4), teamSizes: [3, 3] }),
    ).toThrow();
    expect(() =>
      createGame({ players: players(4), teamSizes: [2, 1, 1, 1] }),
    ).toThrow();
  });
});

describe("team turn order (§7, §114)", () => {
  it("never places teammates consecutively", () => {
    const state = createGame({ players: players(4), teamSizes: [2, 2] });
    const teamOf = new Map(state.players.map((p) => [p.id, p.teamId]));
    for (let i = 1; i < state.turnOrder.length; i++) {
      const prev = teamOf.get(state.turnOrder[i - 1] as string);
      const curr = teamOf.get(state.turnOrder[i] as string);
      expect(curr).not.toBe(prev);
    }
  });

  it("interleaves A1 B1 A2 B2 for two teams", () => {
    const order = buildTurnOrder([
      ["a1", "a2"],
      ["b1", "b2"],
    ]);
    expect(order).toEqual(["a1", "b1", "a2", "b2"]);
  });

  it("interleaves A1 B1 C1 A2 B2 C2 for three teams", () => {
    const order = buildTurnOrder([
      ["a1", "a2"],
      ["b1", "b2"],
      ["c1", "c2"],
    ]);
    expect(order).toEqual(["a1", "b1", "c1", "a2", "b2", "c2"]);
  });

  it("handles uneven team sizes without consecutive teammates", () => {
    const state = createGame({ players: players(12), teamSizes: [6, 6] });
    const teamOf = new Map(state.players.map((p) => [p.id, p.teamId]));
    for (let i = 1; i < state.turnOrder.length; i++) {
      expect(teamOf.get(state.turnOrder[i] as string)).not.toBe(
        teamOf.get(state.turnOrder[i - 1] as string),
      );
    }
  });
});

describe("configuration validation (§4–§8, §106)", () => {
  it("rejects non-Standard team configurations even at a Standard player count", () => {
    expect(() =>
      createGame({ players: players(3), teamSizes: [1, 2] }),
    ).toThrow(/not a Standard configuration/);
    expect(() =>
      createGame({ players: players(4), teamSizes: [1, 3] }),
    ).toThrow(/not a Standard configuration/);
  });

  it("rejects custom team layouts that seat teammates consecutively", () => {
    // [1, 4] interleaves as A1 B1 B2 B3 B4 — illegal under §7.
    expect(() =>
      createGame({ players: players(5), teamSizes: [1, 4], handSize: 6 }),
    ).toThrow(/consecutively/);
  });

  it("accepts an interleaved custom team layout", () => {
    const state = createGame({
      players: players(5),
      teamSizes: [3, 2],
      handSize: 6,
    });
    expect(state.turnOrder).toEqual([
      "player-1",
      "player-4",
      "player-2",
      "player-5",
      "player-3",
    ]);
  });

  it("rejects duplicate explicit ids and generated collisions", () => {
    expect(() =>
      createGame({
        players: [
          { id: "same", name: "A" },
          { id: "same", name: "B" },
        ],
      }),
    ).toThrow(/Duplicate player id/);
    expect(() =>
      createGame({
        players: [{ id: "player-2", name: "A" }, { name: "B" }],
      }),
    ).toThrow(/Duplicate player id/);
  });

  it("rejects empty player names and ids", () => {
    expect(() =>
      createGame({ players: [{ name: "A" }, { name: "   " }] }),
    ).toThrow(/non-empty name/);
    expect(() =>
      createGame({ players: [{ id: "", name: "A" }, { name: "B" }] }),
    ).toThrow(/non-empty id/);
  });

  it("rejects a deal larger than the physical deck", () => {
    expect(() =>
      createGame({ players: players(2), handSize: 53 }),
    ).toThrow(/only 104 exist/);
    expect(() =>
      createGame({ players: players(12), handSize: 20 }),
    ).toThrow(/only 104 exist/);
    expect(() =>
      createGame({ players: players(2), handSize: 52 }),
    ).not.toThrow();
  });

  it("bounds requiredSequences", () => {
    expect(() =>
      createGame({ players: players(2), requiredSequences: 0 }),
    ).toThrow(/positive integer/);
    expect(() =>
      createGame({ players: players(2), requiredSequences: 11 }),
    ).toThrow(/must not exceed 10/);
    expect(() =>
      createGame({ players: players(2), requiredSequences: 3 }),
    ).not.toThrow();
  });

  it("bounds turn timers", () => {
    for (const value of [0, -1, 999, 1.5, Number.NaN, Infinity, 3_600_001]) {
      expect(() =>
        createGame({ players: players(2), turnDurationMs: value }),
      ).toThrow(/turnDurationMs/);
    }
    expect(() =>
      createGame({ players: players(2), turnDurationMs: 1_000 }),
    ).not.toThrow();
    expect(() =>
      createGame({ players: players(2), turnDurationMs: null }),
    ).not.toThrow();
  });

  it("labels Standard and custom rules separately", () => {
    const standard = createGame({ players: players(4) });
    expect(standard.rulesVersion).toBe(RULES_VERSION);

    const custom = createGame({ players: players(4), handSize: 7 });
    expect(custom.rulesVersion).toBe(CUSTOM_RULES_VERSION);
    expect(() =>
      createGame({
        players: players(4),
        handSize: 7,
        rulesVersion: RULES_VERSION,
      }),
    ).toThrow(/non-Standard rulesVersion/);
  });

  it("rejects a non-boolean dead-card exchange flag", () => {
    expect(() =>
      createGame({
        players: players(2),
        // Deliberately malformed client input.
        allowDeadCardExchange: "yes" as unknown as boolean,
      }),
    ).toThrow(/boolean/);
  });

  it("labels dead-card and timer overrides as custom rules", () => {
    const noExchange = startGame(
      createGame({
        players: players(2),
        allowDeadCardExchange: false,
      }),
    ).state;
    expect(noExchange.rulesVersion).toBe(CUSTOM_RULES_VERSION);
    expect(noExchange.rulesConfig.allowDeadCardExchange).toBe(false);
    expect(validateGameState(noExchange)).toEqual([]);

    const timed = startGame(
      createGame({ players: players(2), turnDurationMs: 60_000 }),
    ).state;
    expect(timed.rulesVersion).toBe(CUSTOM_RULES_VERSION);
    expect(validateGameState(timed)).toEqual([]);

    // Explicitly requesting the Standard preset while overriding a custom
    // rule must be rejected, not silently mislabeled.
    expect(() =>
      createGame({
        players: players(2),
        allowDeadCardExchange: false,
        rulesVersion: RULES_VERSION,
      }),
    ).toThrow(/non-Standard rulesVersion/);
  });
});

describe("dealing and game start (§21–§22)", () => {
  it("creates LOBBY, starts ACTIVE with correct hand sizes", () => {
    const created = createGame({ players: players(4), seed: "deal-test" });
    expect(created.status).toBe("LOBBY");
    const result = startGame(created);
    const state = result.state;
    expect(state.status).toBe("ACTIVE");
    for (const player of state.players) {
      expect(state.hands[player.id]?.length).toBe(6);
    }
    expect(state.drawPile.length).toBe(104 - 4 * 6);
    // GAME_STARTED then TURN_STARTED for the opening player (§152).
    expect(result.events[0]?.type).toBe("GAME_STARTED");
    expect(result.events[1]?.type).toBe("TURN_STARTED");
  });

  it("deals 7 each in a 2-player game and keeps 90 in the draw pile", () => {
    const state = startGame(createGame({ players: players(2), seed: "x" })).state;
    for (const hand of Object.values(state.hands)) {
      expect(hand.length).toBe(7);
    }
    const totalHands = Object.values(state.hands).reduce(
      (sum, hand) => sum + hand.length,
      0,
    );
    expect(totalHands).toBe(14);
    expect(state.drawPile.length).toBe(90);
  });

  it("is deterministic for the same seed (§106)", () => {
    const a = startGame(createGame({ players: players(4), seed: "fixed" })).state;
    const b = startGame(createGame({ players: players(4), seed: "fixed" })).state;
    expect(a.drawPile).toEqual(b.drawPile);
    expect(a.hands).toEqual(b.hands);
    expect(a.currentTurnIndex).toBe(b.currentTurnIndex);
  });

  it("chooses the starting player within the turn order (§22)", () => {
    const state = startGame(createGame({ players: players(3), seed: "s" })).state;
    expect(state.startingSeat).toBeGreaterThanOrEqual(0);
    expect(state.startingSeat).toBeLessThan(3);
    expect(state.currentTurnIndex).toBe(state.startingSeat);
  });

  it("starts every game with valid invariants", () => {
    for (const seed of ["a", "b", "c"]) {
      const state = startGame(
        createGame({ players: players(6), teamSizes: [3, 3], seed }),
      ).state;
      expect(validateGameState(state)).toEqual([]);
    }
  });

  it("deals every Standard player count/configuration exactly", () => {
    for (const playerCount of STANDARD_PLAYER_COUNTS) {
      for (const teamSizes of standardTeamConfigurations(playerCount)) {
        const state = startGame(
          createGame({
            players: players(playerCount),
            teamSizes,
            seed: `deal-${playerCount}-${teamSizes.join("-")}`,
          }),
        ).state;

        const handSize = standardHandSize(playerCount);
        const dealt = Object.values(state.hands).flat();
        expect(dealt).toHaveLength(handSize * playerCount);
        expect(state.drawPile).toHaveLength(
          104 - handSize * playerCount,
        );
        expect(new Set(dealt).size).toBe(dealt.length);
        expect(
          Object.values(state.hands).every((hand) => hand.length === handSize),
        ).toBe(true);
        expect(validateGameState(state)).toEqual([]);
      }
    }
  });

  it("accepts uneven custom layouts only when the turn order interleaves", () => {
    const accepted = startGame(
      createGame({
        players: players(5),
        teamSizes: [3, 2],
        handSize: 6,
      }),
    ).state;
    expect(accepted.teams.map((team) => team.memberIds.length)).toEqual([3, 2]);
    expect(validateGameState(accepted)).toEqual([]);

    expect(() =>
      createGame({ players: players(5), teamSizes: [2, 3], handSize: 6 }),
    ).toThrow(/consecutively/);

    const threeSides = startGame(
      createGame({
        players: players(8),
        teamSizes: [3, 3, 2],
        handSize: 5,
      }),
    ).state;
    expect(threeSides.teams).toHaveLength(3);
    expect(validateGameState(threeSides)).toEqual([]);

    expect(() =>
      createGame({ players: players(7), teamSizes: [2, 2, 3], handSize: 5 }),
    ).toThrow(/consecutively/);
  });

  it("refuses to start twice", () => {
    const state = startGame(createGame({ players: players(2) })).state;
    expect(() => startGame(state)).toThrow();
  });
});
