/**
 * Draw pile, replacement draws and reshuffling (§45–§50).
 *
 *  - Automatic replacement draw after every main action (§46).
 *  - Victory before draw: winning turns never draw (§47).
 *  - Draw pile exhaustion: gather discards, shuffle with authoritative RNG,
 *    create a new draw pile (§48).
 *  - Hands are never reshuffled (§49); a just-played card may return (§50).
 */

import { shuffled } from "./rng.js";
import type { DrawReason, DomainEvent } from "./events.js";
import type { CardId } from "./cards.js";
import type { GameState, PlayerId } from "./state.js";

export function drawCards(
  state: GameState,
  playerId: PlayerId,
  count: number,
  reason: DrawReason,
): { state: GameState; events: DomainEvent[] } {
  let current = state;
  const events: DomainEvent[] = [];

  for (let i = 0; i < count; i++) {
    let drawPile = [...current.drawPile];

    if (drawPile.length === 0) {
      const reshuffle = reshuffleDiscards(current);
      current = reshuffle.state;
      events.push(...reshuffle.events);
      drawPile = [...current.drawPile];
    }

    const cardId = drawPile[0];
    if (cardId === undefined) {
      throw new Error("Draw pile empty after reshuffle — card conservation violated");
    }
    const rest = drawPile.slice(1);
    const hand = [...(current.hands[playerId] ?? []), cardId];
    current = {
      ...current,
      drawPile: rest,
      hands: { ...current.hands, [playerId]: hand },
    };

    const card = current.cards[cardId];
    events.push({
      type: "CARD_DRAWN",
      playerId,
      cardId,
      cardCode: card?.code ?? "",
      reason,
    });
  }

  return { state: current, events };
}

/**
 * §48: collect all discard piles in deterministic seat order, shuffle with
 * the authoritative RNG and create a new draw pile.
 */
function reshuffleDiscards(state: GameState): {
  state: GameState;
  events: DomainEvent[];
} {
  const collected: CardId[] = [];
  const discardPiles: Record<PlayerId, CardId[]> = {};
  const bySeat = [...state.players].sort((a, b) => a.seat - b.seat);
  for (const player of bySeat) {
    discardPiles[player.id] = [];
    collected.push(...(state.discardPiles[player.id] ?? []));
  }

  if (collected.length === 0) {
    throw new Error(
      "Cannot reshuffle: no discarded cards and draw pile is empty",
    );
  }

  const result = shuffled(state.rng, collected);
  return {
    state: {
      ...state,
      rng: result.state,
      discardPiles,
      drawPile: result.items,
    },
    events: [{ type: "DECK_RESHUFFLED", discardedCount: collected.length }],
  };
}

/** Discards a card into its player's pile (§45). */
export function discardCard(
  state: GameState,
  playerId: PlayerId,
  cardId: CardId,
): GameState {
  const hand = (state.hands[playerId] ?? []).filter((id) => id !== cardId);
  return {
    ...state,
    hands: { ...state.hands, [playerId]: hand },
    discardPiles: {
      ...state.discardPiles,
      [playerId]: [...(state.discardPiles[playerId] ?? []), cardId],
    },
  };
}

/** Total cards across all zones must remain 104 (§19). */
export function countAllCards(state: GameState): number {
  let total = state.drawPile.length;
  for (const hand of Object.values(state.hands)) total += hand.length;
  for (const pile of Object.values(state.discardPiles)) total += pile.length;
  return total;
}
