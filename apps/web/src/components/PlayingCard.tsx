/**
 * PlayingCard — original vector-style miniature cards (§39–§41).
 * CSS/SVG rendering, no photographic assets, excellent small-screen
 * legibility. Two detail levels: full (desktop) and compact (mobile).
 */

"use client";

import { cardLabel, isOneEyedJackCode, isTwoEyedJackCode, type CardCode } from "@quintara/game-engine";

const RED_SUITS = new Set(["H", "D"]);

const SUIT_GLYPH: Record<string, string> = {
  C: "♣",
  D: "♦",
  H: "♥",
  S: "♠",
};

function suitOf(code: CardCode): string {
  return code.slice(-1);
}

function rankOf(code: CardCode): string {
  return code.slice(0, -1);
}

export interface PlayingCardProps {
  code: CardCode;
  selected?: boolean;
  playable?: boolean;
  dead?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  ariaHint?: string;
}

export function PlayingCard({
  code,
  selected = false,
  playable = false,
  dead = false,
  disabled = false,
  compact = false,
  onClick,
  ariaHint,
}: PlayingCardProps) {
  const suit = suitOf(code);
  const rank = rankOf(code);
  const isRed = RED_SUITS.has(suit);
  const isJack = rank === "J";
  const twoEyed = isTwoEyedJackCode(code);
  const oneEyed = isOneEyedJackCode(code);

  const classes = [
    "playing-card",
    isRed ? "is-red" : "",
    selected ? "is-selected" : "",
    playable && !selected ? "is-playable" : "",
    dead ? "is-dead" : "",
    disabled && !dead ? "is-disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const description = `${cardLabel(code)}${dead ? ", dead" : playable ? ", playable" : ""}${ariaHint ? `. ${ariaHint}` : ""}`;

  return (
    <button
      type="button"
      className={`${classes} shrink-0 text-left`}
      style={{
        width: compact ? "clamp(42px, 11vw, 58px)" : "clamp(56px, 8vw, 78px)",
        aspectRatio: "5 / 7",
        padding: compact ? "4px" : "6px",
      }}
      onClick={onClick}
      disabled={disabled}
      aria-label={description}
      aria-pressed={selected}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between leading-none">
          <span
            className="font-bold"
            style={{ fontSize: compact ? "0.85rem" : "1.05rem" }}
          >
            {rank}
          </span>
          <span
            aria-hidden
            style={{ fontSize: compact ? "0.7rem" : "0.85rem" }}
          >
            {SUIT_GLYPH[suit]}
          </span>
        </div>

        <div
          className="flex flex-1 items-center justify-center"
          aria-hidden
          style={{ fontSize: compact ? "1.25rem" : "1.85rem" }}
        >
          {isJack ? <JackFace twoEyed={twoEyed} oneEyed={oneEyed} /> : SUIT_GLYPH[suit]}
        </div>

        <div className="flex items-end justify-between leading-none">
          <span aria-hidden style={{ fontSize: compact ? "0.7rem" : "0.85rem" }}>
            {SUIT_GLYPH[suit]}
          </span>
          <span
            className="font-bold rotate-180"
            style={{ fontSize: compact ? "0.85rem" : "1.05rem" }}
          >
            {rank}
          </span>
        </div>
      </div>

      {dead && (
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-[0.62rem] font-bold tracking-widest"
          style={{
            background: "rgba(239, 83, 80, 0.92)",
            color: "#fff",
          }}
        >
          DEAD
        </span>
      )}
    </button>
  );
}

/** Stylised Jack face: one eye vs two eyes (§12–§13 visual cue). */
function JackFace({ twoEyed, oneEyed }: { twoEyed: boolean; oneEyed: boolean }) {
  return (
    <svg viewBox="0 0 40 40" width="72%" height="72%" aria-hidden>
      <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" />
      {twoEyed && (
        <>
          <circle cx="14" cy="17" r="3.2" fill="currentColor" />
          <circle cx="26" cy="17" r="3.2" fill="currentColor" />
        </>
      )}
      {oneEyed && <circle cx="20" cy="17" r="3.2" fill="currentColor" />}
      <path
        d="M13 26c2.4 2.6 11.6 2.6 14 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Quintara card back with the interlocking five-node lattice motif (§40). */
export function CardBack({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="card-back playing-card shrink-0"
      style={{
        width: compact ? "clamp(42px, 11vw, 58px)" : "clamp(56px, 8vw, 78px)",
        aspectRatio: "5 / 7",
      }}
      aria-hidden
    />
  );
}
