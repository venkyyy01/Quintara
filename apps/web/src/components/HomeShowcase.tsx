"use client";

/**
 * HomeShowcase — the cinematic 3D board tableau on the landing screen.
 *
 * It is a stylised miniature of the real board: the same data-driven cell
 * layout, a completed gold line and floating cards. Pointer movement tilts the
 * tableau directly through CSS variables, keeping React out of the hot path.
 */

import type { PointerEvent as ReactPointerEvent } from "react";
import type { BoardCellDefinition } from "@quintara/game-engine";

const SUIT_GLYPH: Record<string, string> = {
  C: "♣",
  D: "♦",
  H: "♥",
  S: "♠",
};

const MARKERS: Record<string, { className: string }> = {
  r4c1: { className: "marker-blue" },
  r4c2: { className: "marker-blue" },
  r4c3: { className: "marker-blue" },
  r4c4: { className: "marker-blue" },
  r4c5: { className: "marker-blue" },
  r6c7: { className: "marker-red" },
  r7c6: { className: "marker-red" },
  r7c7: { className: "marker-red" },
  r2c8: { className: "marker-gold" },
};

const SPARKS = [
  { top: "18%", left: "4%", delay: "0s" },
  { top: "70%", left: "88%", delay: "0.9s" },
  { top: "8%", left: "62%", delay: "1.7s" },
  { top: "84%", left: "16%", delay: "2.3s" },
  { top: "42%", left: "94%", delay: "2.9s" },
];

export function HomeShowcase({
  cells,
}: {
  cells: readonly BoardCellDefinition[];
}) {
  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty(
      "--showcase-tilt-y",
      `${(x * 9).toFixed(2)}deg`,
    );
    event.currentTarget.style.setProperty(
      "--showcase-tilt-x",
      `${(y * -6).toFixed(2)}deg`,
    );
  }

  function handlePointerLeave(
    event: ReactPointerEvent<HTMLDivElement>,
  ): void {
    event.currentTarget.style.setProperty("--showcase-tilt-y", "0deg");
    event.currentTarget.style.setProperty("--showcase-tilt-x", "0deg");
  }

  return (
    <div
      className="hero-showcase"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      aria-hidden
    >
      <div className="showcase-halo" />

      <div className="showcase-board">
        <div className="showcase-grid">
          {cells.map((cell) => {
            const marker = MARKERS[cell.id];
            if (cell.type === "WILD_CORNER") {
              return (
                <div key={cell.id} className="showcase-cell is-wild">
                  ✦
                </div>
              );
            }
            const suit = cell.cardCode.slice(-1);
            const rank = cell.cardCode.slice(0, -1);
            const red = suit === "H" || suit === "D";
            return (
              <div
                key={cell.id}
                className={`showcase-cell${red ? " is-red" : ""}`}
              >
                <span>{rank}</span>
                <span>{SUIT_GLYPH[suit]}</span>
                {marker && (
                  <span
                    className={`showcase-marker ${marker.className}`}
                    style={{ animationDelay: `${cell.column * 40}ms` }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="showcase-line" />
      </div>

      <ShowcaseCard
        className="showcase-card-a"
        rank="A"
        suit="H"
        red
      />
      <ShowcaseCard className="showcase-card-b" rank="K" suit="S" />
      <div className="showcase-card showcase-card-c card-back" />

      {SPARKS.map((spark, index) => (
        <span
          key={index}
          className="showcase-spark"
          style={{ top: spark.top, left: spark.left, animationDelay: spark.delay }}
        />
      ))}
    </div>
  );
}

function ShowcaseCard({
  className,
  rank,
  suit,
  red = false,
}: {
  className: string;
  rank: string;
  suit: string;
  red?: boolean;
}) {
  return (
    <div
      className={`showcase-card playing-card${red ? " is-red" : ""} ${className}`}
    >
      <div className="flex h-full flex-col justify-between leading-none">
        <div className="flex items-start justify-between">
          <span className="text-sm font-bold">{rank}</span>
          <span className="text-xs" aria-hidden>
            {SUIT_GLYPH[suit]}
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center text-2xl">
          {SUIT_GLYPH[suit]}
        </div>
        <div className="flex items-end justify-between">
          <span className="text-xs" aria-hidden>
            {SUIT_GLYPH[suit]}
          </span>
          <span className="rotate-180 text-sm font-bold">{rank}</span>
        </div>
      </div>
    </div>
  );
}
