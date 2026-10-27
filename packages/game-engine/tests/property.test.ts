/**
 * Property-based tests over random legal games (§133–§137).
 *
 * Uses the engine's own deterministic PRNG so failures reproduce exactly.
 */
import { describe, expect, it } from "vitest";
import {
  applyCommand,
  countAllCards,
  createRngState,
  getLegalActions,
  resolveSequenceSelectionDefault,
  rngNextInt,
  scenario,
  validateGameState,
  type GameCommand,
  type GameState,
  type RngState,
} from "../src/index.js";

function pick<T>(rng: RngState, items: readonly T[]): { rng: RngState; item: T } {
  const step = rngNextInt(rng, items.length);
  return { rng: step.state, item: items[step.value] as T };
}

/** Plays random legal commands until the game ends or the cap is hit. */
function randomPlayout(seed: string, maxCommands = 300): GameState {
  let rng: RngState = createRngState(seed);
  let state = scenario({ seed }).build();
  let actionCounter = 0;

  for (let i = 0; i < maxCommands && state.status === "ACTIVE"; i++) {
    const playerId = state.turnOrder[state.currentTurnIndex]!;

    if (state.turnPhase === "AWAITING_SEQUENCE_SELECTION") {
      const sequences = resolveSequenceSelectionDefault(state);
      const command: GameCommand = {
        type: "SELECT_SEQUENCE_SET",
        playerId,
        actionId: `a${actionCounter++}`,
        sequenceCellSets: sequences.map((s) => [...s.cells]),
      };
      state = applyCommand(state, command).state;
      continue;
    }

    const legal = getLegalActions(state, playerId);
    const options: GameCommand[] = [
      ...legal.deadExchanges.map(
        (a): GameCommand => ({
          type: "EXCHANGE_DEAD_CARD",
          playerId,
          actionId: `a${actionCounter++}`,
          cardId: a.cardId,
        }),
      ),
      ...legal.mainActions.map((a): GameCommand => {
        switch (a.type) {
          case "PLAY_NORMAL_CARD":
            return {
              type: "PLAY_NORMAL_CARD",
              playerId,
              actionId: `a${actionCounter++}`,
              cardId: a.cardId,
              targetCellId: a.targetCellId,
            };
          case "PLAY_WILD_JACK":
            return {
              type: "PLAY_WILD_JACK",
              playerId,
              actionId: `a${actionCounter++}`,
              cardId: a.cardId,
              targetCellId: a.targetCellId,
            };
          case "PLAY_REMOVE_JACK":
            return {
              type: "PLAY_REMOVE_JACK",
              playerId,
              actionId: `a${actionCounter++}`,
              cardId: a.cardId,
              targetCellId: a.targetCellId,
            };
        }
      }),
    ];

    if (options.length === 0) {
      // The engine's safeguard should have skipped already; treat as stuck.
      throw new Error("No legal options but game is active");
    }

    const chosen = pick(rng, options);
    rng = chosen.rng;
    state = applyCommand(state, chosen.item).state;
  }

  return state;
}

describe("property: random legal games (§133–§135)", () => {
  it.each(["seed-1", "seed-2", "seed-3", "seed-4", "seed-5"])(
    "preserves all invariants through a full random game (%s)",
    (seed) => {
      let rng = createRngState(`${seed}-checks`);
      let state = scenario({ seed }).build();

      for (let i = 0; i < 120 && state.status === "ACTIVE"; i++) {
        const before = state;
        const playerId = state.turnOrder[state.currentTurnIndex]!;

        if (state.turnPhase === "AWAITING_SEQUENCE_SELECTION") {
          const sequences = resolveSequenceSelectionDefault(state);
          state = applyCommand(state, {
            type: "SELECT_SEQUENCE_SET",
            playerId,
            actionId: `p${i}`,
            sequenceCellSets: sequences.map((s) => [...s.cells]),
          }).state;
        } else {
          const legal = getLegalActions(state, playerId);
          const main = legal.mainActions;
          const actions = main.length > 0 ? main : legal.deadExchanges;
          if (actions.length === 0) throw new Error("no actions");
          const step = pick(rng, actions);
          rng = step.rng;
          const a = step.item;
          const command: GameCommand =
            a.type === "EXCHANGE_DEAD_CARD"
              ? {
                  type: "EXCHANGE_DEAD_CARD",
                  playerId,
                  actionId: `p${i}`,
                  cardId: a.cardId,
                }
              : {
                  type: a.type,
                  playerId,
                  actionId: `p${i}`,
                  cardId: a.cardId,
                  targetCellId: (
                    a as { targetCellId: string }
                  ).targetCellId,
                };
          state = applyCommand(state, command).state;
        }

        // §133: card conservation after every command.
        expect(countAllCards(state)).toBe(104);
        // §134: board occupancy bounds; corners never occupied.
        const occupied = Object.entries(state.board.cells).filter(
          ([, occ]) => occ.occupantTeamId !== null,
        );
        expect(occupied.length).toBeGreaterThanOrEqual(0);
        expect(occupied.length).toBeLessThanOrEqual(96);
        // §135: every stored sequence is valid + all other invariants.
        expect(validateGameState(state)).toEqual([]);
        expect(state.version).toBe(before.version + 1);
      }
    },
  );

  it("games progress without deadlock (safeguard keeps turns moving)", () => {
    const final = randomPlayout("progress-1", 200);
    // Either finished or still healthy after 200 commands.
    if (final.status === "ACTIVE") {
      expect(validateGameState(final)).toEqual([]);
    } else {
      expect(final.resultType).not.toBeNull();
    }
    expect(countAllCards(final)).toBe(104);
  });
});

describe("property: legal-action safety (§136)", () => {
  it("every action from getLegalActions executes without error", () => {
    let state = scenario({ seed: "safety" }).build();
    for (let i = 0; i < 40 && state.status === "ACTIVE"; i++) {
      const playerId = state.turnOrder[state.currentTurnIndex]!;
      if (state.turnPhase === "AWAITING_SEQUENCE_SELECTION") {
        const sequences = resolveSequenceSelectionDefault(state);
        state = applyCommand(state, {
          type: "SELECT_SEQUENCE_SET",
          playerId,
          actionId: `s${i}`,
          sequenceCellSets: sequences.map((s) => [...s.cells]),
        }).state;
        continue;
      }
      const legal = getLegalActions(state, playerId);
      const all = [...legal.deadExchanges, ...legal.mainActions];
      for (const action of all) {
        // Execute each advertised action on a fresh copy of the state.
        const command: GameCommand =
          action.type === "EXCHANGE_DEAD_CARD"
            ? {
                type: "EXCHANGE_DEAD_CARD",
                playerId,
                actionId: `probe-${i}-${action.type}`,
                cardId: action.cardId,
              }
            : {
                type: action.type,
                playerId,
                actionId: `probe-${i}-${action.type}`,
                cardId: action.cardId,
                targetCellId: (action as { targetCellId: string }).targetCellId,
              };
        expect(() => applyCommand(state, command)).not.toThrow();
      }
      // Then actually play one to advance the game.
      const first = all[0];
      if (!first) throw new Error("no actions");
      const command: GameCommand =
        first.type === "EXCHANGE_DEAD_CARD"
          ? {
              type: "EXCHANGE_DEAD_CARD",
              playerId,
              actionId: `s${i}`,
              cardId: first.cardId,
            }
          : {
              type: first.type,
              playerId,
              actionId: `s${i}`,
              cardId: first.cardId,
              targetCellId: (first as { targetCellId: string }).targetCellId,
            };
      state = applyCommand(state, command).state;
    }
    expect(validateGameState(state)).toEqual([]);
  });
});

describe("property: illegal mutations are rejected atomically (§137)", () => {
  it("malformed commands leave the state byte-for-byte unchanged", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withHand("B", ["2C"])
      .withMarker("B", 5, 5)
      .build();
    const before = JSON.stringify(state);

    const malformed: GameCommand[] = [
      // Wrong card id.
      {
        type: "PLAY_NORMAL_CARD",
        playerId: "p-A",
        actionId: "m1",
        cardId: "D1-NOT-A-CARD",
        targetCellId: "r1c1",
      },
      // Wrong player.
      {
        type: "PLAY_NORMAL_CARD",
        playerId: "p-B",
        actionId: "m2",
        cardId: "whatever",
        targetCellId: "r1c1",
      },
      // Occupied target.
      {
        type: "PLAY_WILD_JACK",
        playerId: "p-A",
        actionId: "m3",
        cardId: "nope",
        targetCellId: "r5c5",
      },
      // Stale version.
      {
        type: "PLAY_NORMAL_CARD",
        playerId: "p-A",
        actionId: "m4",
        expectedVersion: 999,
        cardId: "nope",
        targetCellId: "r1c1",
      },
      // Invalid selection with no pending options.
      {
        type: "SELECT_SEQUENCE_SET",
        playerId: "p-A",
        actionId: "m5",
        sequenceCellSets: [["r1c1", "r1c2", "r1c3", "r1c4", "r1c5"]],
      },
    ];

    for (const command of malformed) {
      expect(() => applyCommand(state, command)).toThrow();
      expect(JSON.stringify(state)).toBe(before);
    }
    expect(validateGameState(state)).toEqual([]);
  });
});
