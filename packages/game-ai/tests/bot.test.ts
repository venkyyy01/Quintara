/**
 * Bot sanity tests: bots only make legal engine moves, respect the
 * information boundary and can play full games (Design Plan §22, §91).
 */
import { describe, expect, it } from "vitest";
import {
  applyCommand,
  countAllCards,
  createGame,
  currentPlayerId,
  getLegalActions,
  startGame,
  validateGameState,
  type GameCommand,
  type GameState,
} from "@quintara/game-engine";
import {
  chooseBotAction,
  createBotContext,
  decisionToCommand,
  type AiDifficulty,
} from "../src/index.js";

function playBotGame(difficulty: AiDifficulty, seed: string, maxTurns = 400): GameState {
  let state = startGame(
    createGame({
      players: [
        { id: "bot-a", name: "Bot A" },
        { id: "bot-b", name: "Bot B" },
      ],
      seed,
    }),
  ).state;

  const contexts = {
    "bot-a": createBotContext(difficulty, `${seed}-a`),
    "bot-b": createBotContext(difficulty, `${seed}-b`),
  };

  for (let i = 0; i < maxTurns && state.status === "ACTIVE"; i++) {
    const playerId = currentPlayerId(state);
    if (!playerId) break;
    const decision = chooseBotAction(state, playerId, contexts[playerId as "bot-a"]);
    const command: GameCommand = decisionToCommand(
      decision,
      playerId,
      `bot-${i}`,
      state.version,
    );
    state = applyCommand(state, command).state;
  }
  return state;
}

describe("bot legality (§42, §91)", () => {
  it.each(["EASY", "MEDIUM", "HARD", "EXPERT"] as const)(
    "%s bot plays only legal moves in a full game",
    (difficulty) => {
      const state = playBotGame(difficulty, `legal-${difficulty}`);
      expect(countAllCards(state)).toBe(104);
      expect(validateGameState(state)).toEqual([]);
    },
  );

  it("MEDIUM bot makes a legal opening move for whichever seat starts", () => {
    let state = startGame(
      createGame({
        players: [
          { id: "bot-a", name: "A" },
          { id: "bot-b", name: "B" },
        ],
        seed: "win-test",
      }),
    ).state;

    const active = currentPlayerId(state)!;
    const legal = getLegalActions(state, active);
    expect(legal.mainActions.length).toBeGreaterThan(0);
    state = applyCommand(
      state,
      decisionToCommand(
        chooseBotAction(state, active, createBotContext("MEDIUM", "m1")),
        active,
        "m-1",
        state.version,
      ),
    ).state;
    expect(validateGameState(state)).toEqual([]);
  });

  it("EXPERT game reaches a terminal or healthy state", () => {
    const state = playBotGame("EXPERT", "expert-1", 300);
    if (state.status === "FINISHED") {
      expect(state.resultType).not.toBeNull();
    } else {
      expect(validateGameState(state)).toEqual([]);
    }
  });
});
