/**
 * Quintara AI players (Design Plan §22).
 *
 * Information boundary (§91): bots use only the information legitimately
 * available to the seat they control — their own hand, the public board,
 * public discards, card counts and turn history. They never inspect human
 * hands, future deck order or hidden RNG information.
 *
 * Difficulty ladder:
 *  - EASY:   random legal move with basic safeguards.
 *  - MEDIUM: heuristic evaluation (Design Plan §22 weights).
 *  - HARD:   threat modelling, Jack conservation, opponent blocking.
 *  - EXPERT: Monte-Carlo style sampling over legal continuations.
 */

export type AiDifficulty = "EASY" | "MEDIUM" | "HARD" | "EXPERT";

export * from "./bot.js";
export * from "./heuristics.js";
