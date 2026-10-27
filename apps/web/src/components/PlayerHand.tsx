/**
 * PlayerHand — bottom dock (§52). Selected card lifts; dead cards show a
 * DEAD badge without losing readability; dead cards can be exchanged from
 * here (§11).
 */

"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  cardLabel,
  isDeadCard,
  type GameState,
  type ProjectedState,
  type ViewerCardInfo,
} from "@quintara/game-engine";
import { PlayingCard } from "./PlayingCard";

export interface PlayerHandProps {
  projected: ProjectedState;
  /** Authoritative state needed to derive deadness (local modes only). */
  authoritativeState: GameState | null;
  selectedCardId: string | null;
  canAct: boolean;
  deadExchangeAvailable: boolean;
  onSelectCard: (cardId: string) => void;
  onExchange: (cardId: string) => void;
}

export function PlayerHand({
  projected,
  authoritativeState,
  selectedCardId,
  canAct,
  deadExchangeAvailable,
  onSelectCard,
  onExchange,
}: PlayerHandProps) {
  const reduced = useReducedMotion();
  const hand = projected.hand ?? [];

  if (hand.length === 0) {
    return (
      <div className="hand-dock justify-center text-sm text-secondary">
        {projected.status === "ACTIVE"
          ? "No cards in hand"
          : "Game over"}
      </div>
    );
  }

  const legalCardIds = new Set(
    (projected.legalActions?.mainActions ?? []).map((a) => a.cardId),
  );
  const exchangeIds = new Set(
    (projected.legalActions?.deadExchanges ?? []).map((a) => a.cardId),
  );

  return (
    <div className="hand-dock" role="listbox" aria-label="Your hand">
      {hand.map((card: ViewerCardInfo, index) => {
        const dead =
          authoritativeState !== null
            ? isDeadCard(
                authoritativeState,
                authoritativeState.cards[card.id]!,
              )
            : exchangeIds.has(card.id);
        const playable = canAct && legalCardIds.has(card.id);
        const exchangeable = canAct && deadExchangeAvailable && exchangeIds.has(card.id);

        return (
          <motion.div
            key={card.id}
            role="option"
            aria-selected={selectedCardId === card.id}
            initial={reduced ? false : { y: 26, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: reduced ? 0 : index * 0.05,
              duration: 0.3,
            }}
            className="flex flex-col items-center gap-1.5"
          >
            <PlayingCard
              code={card.code}
              selected={selectedCardId === card.id}
              playable={playable}
              dead={dead && !playable}
              disabled={!canAct}
              onClick={() => canAct && onSelectCard(card.id)}
              ariaHint={
                dead
                  ? "Dead card"
                  : playable
                    ? "Playable"
                    : "Selected"
              }
            />
            {exchangeable && (
              <button
                type="button"
                className="btn btn-secondary px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-wide"
                onClick={() => onExchange(card.id)}
                aria-label={`Exchange dead card ${cardLabel(card.code)}`}
              >
                Exchange
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
