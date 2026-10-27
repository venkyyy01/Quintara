/**
 * Shared test helpers (lookup by card code / board identity).
 */
import {
  cardCellsForCode,
  parseCellId,
  type CardCode,
  type CardId,
  type GameState,
  type PlayerId,
} from "../src/index.js";

/** Coordinates of the two board cells carrying a card identity. */
export function codeCoords(
  state: GameState,
  code: CardCode,
): { row: number; column: number }[] {
  return cardCellsForCode(state.boardDefinition, code).map((id) =>
    parseCellId(id),
  );
}

/** Cell ids of the two board cells carrying a card identity. */
export function codeCells(state: GameState, code: CardCode): string[] {
  return cardCellsForCode(state.boardDefinition, code);
}

/** Id of the physical card instance with the given code in a player's hand. */
export function handCardId(
  state: GameState,
  playerId: PlayerId,
  code: CardCode,
): CardId {
  const found = (state.hands[playerId] ?? []).find(
    (cardId) => state.cards[cardId]?.code === code,
  );
  if (!found) {
    throw new Error(`${playerId} does not hold ${code}`);
  }
  return found;
}

/** Builds a GameCommand with the current version attached. */
export function withVersion<T extends object>(
  state: GameState,
  command: T,
): T & { expectedVersion: number } {
  return { ...command, expectedVersion: state.version };
}

/**
 * Redistributes every physical card exactly as specified (test tooling).
 * `hands` and `drawPile` take card ids. Unlisted cards go to `remainder`
 * (a player id for their hand, or "discard" for the first player's pile).
 * Guarantees card conservation (§19).
 */
export function assignAllCards(
  state: GameState,
  hands: Record<string, CardId[]>,
  drawPile: CardId[],
  remainder: string | "discard",
): GameState {
  const listed = new Set<CardId>([
    ...drawPile,
    ...Object.values(hands).flat(),
  ]);
  const rest = Object.keys(state.cards).filter((id) => !listed.has(id));
  const discardPiles: Record<string, CardId[]> = {};
  for (const player of state.players) {
    discardPiles[player.id] = [];
  }
  const finalHands: Record<string, CardId[]> = {};
  for (const player of state.players) {
    finalHands[player.id] = [...(hands[player.id] ?? [])];
  }
  if (remainder === "discard") {
    discardPiles[state.players[0]!.id] = rest.sort();
  } else {
    finalHands[remainder] = [...(finalHands[remainder] ?? []), ...rest];
  }
  return { ...state, hands: finalHands, drawPile, discardPiles };
}
