/**
 * GameBoard — the visually dominant 10 × 10 surface (§35).
 *
 * Legal-move guidance (§49): legal targets glow, illegal cells dim, and
 * invalid cells never show misleading hover states (§50). Completed
 * sequences stay subtly visible via a gold trace (§47).
 */

"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  cardLabel,
  type CellId,
  type ProjectedState,
} from "@quintara/game-engine";
import { TeamMarker } from "./TeamMarker";
import { teamVisual } from "@/lib/team-visuals";

export interface GameBoardProps {
  projected: ProjectedState;
  selectedCardId: string | null;
  legalTargets: ReadonlySet<CellId>;
  removableTargets: ReadonlySet<CellId>;
  showLegalMoves: boolean;
  animationSpeed: number;
  lastPlacedCellId?: CellId | null;
  onCellClick: (cellId: CellId) => void;
}

export function GameBoard({
  projected,
  selectedCardId,
  legalTargets,
  removableTargets,
  showLegalMoves,
  animationSpeed,
  lastPlacedCellId = null,
  onCellClick,
}: GameBoardProps) {
  const reduced = useReducedMotion();
  const selecting = selectedCardId !== null;

  const protectedCells = useMemo(() => {
    const set = new Set<CellId>();
    for (const [cellId, sequenceIds] of Object.entries(
      projected.sequenceMembership,
    )) {
      if ((sequenceIds as string[]).length > 0) set.add(cellId as CellId);
    }
    return set;
  }, [projected.sequenceMembership]);

  return (
    <div className="board-surface w-full">
      <div className="board-grid" role="grid" aria-label="Quintara game board">
        {projected.boardDefinition.cells.map((cell) => {
          const occupancy = projected.boardCells[cell.id];
          const occupantTeamId = occupancy?.occupantTeamId ?? null;
          const isWild = cell.type === "WILD_CORNER";
          const isLegal = legalTargets.has(cell.id);
          const isRemovable = removableTargets.has(cell.id);
          const isProtected = protectedCells.has(cell.id);

          const dimmed =
            selecting && showLegalMoves && !isLegal && !isRemovable;
          const classes = [
            "board-cell",
            isWild ? "is-wild" : "",
            showLegalMoves && isLegal ? "is-legal" : "",
            showLegalMoves && isRemovable ? "is-targetable" : "",
            dimmed ? "is-dimmed" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const label =
            cell.type === "WILD_CORNER"
              ? `Row ${cell.row + 1} column ${cell.column + 1}. Wild corner.`
              : `Row ${cell.row + 1} column ${cell.column + 1}. ${cardLabel(cell.cardCode)}.${occupantTeamId ? ` Occupied by ${teamName(projected, occupantTeamId)}.` : " Open."}${isProtected ? " Protected sequence marker." : ""}`;

          return (
            <button
              key={cell.id}
              type="button"
              role="gridcell"
              className={classes}
              aria-label={label}
              onClick={() => {
                if (isLegal || isRemovable) onCellClick(cell.id);
              }}
              disabled={!isLegal && !isRemovable}
              style={{
                cursor: isLegal || isRemovable ? "pointer" : "default",
                opacity: dimmed ? 0.38 : 1,
              }}
              // Valid targets stay tappable; the highlight is only guidance.
            >
              {cell.type === "CARD" ? (
                <CardFace
                  rank={cell.cardCode.slice(0, -1)}
                  suit={cell.cardCode.slice(-1)}
                />
              ) : (
                <WildCornerGlyph />
              )}

              {occupantTeamId && (
                <TeamMarker
                  teamId={occupantTeamId}
                  teamName={teamName(projected, occupantTeamId)}
                  isNew={lastPlacedCellId === cell.id && !reduced}
                  animationSpeed={animationSpeed}
                  compact
                />
              )}

              {isProtected && occupantTeamId && (
                <span
                  className="sequence-trace"
                  style={{
                    boxShadow: `inset 0 0 0 2px ${teamVisual(occupantTeamId).ringColor}cc`,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function teamName(projected: ProjectedState, teamId: string): string {
  return projected.teams.find((t) => t.id === teamId)?.name ?? teamId;
}

/** Miniature vector card face inside a board cell (§39). */
function CardFace({ rank, suit }: { rank: string; suit: string }) {
  const glyph =
    suit === "C" ? "♣" : suit === "D" ? "♦" : suit === "H" ? "♥" : "♠";
  const red = suit === "H" || suit === "D";
  return (
    <span
      className="flex h-full w-full flex-col items-center justify-center leading-none"
      style={{ color: red ? "#b3261e" : "#232a35" }}
      aria-hidden
    >
      <span className="text-[clamp(0.55rem,1.6vw,0.95rem)] font-bold">
        {rank}
      </span>
      <span className="text-[clamp(0.55rem,1.5vw,0.9rem)]">{glyph}</span>
    </span>
  );
}

function WildCornerGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="62%"
      height="62%"
      aria-hidden
      opacity="0.85"
    >
      <path
        d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"
        fill="rgba(120, 84, 20, 0.75)"
      />
    </svg>
  );
}

/** Animated overlay drawn over completed sequences (§47). */
export function SequenceTraceOverlay({
  projected,
  speed,
}: {
  projected: ProjectedState;
  speed: number;
}) {
  const reduced = useReducedMotion();
  const sequences = Object.values(projected.completedSequences).flat();
  if (sequences.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 10 10"
      aria-hidden
    >
      {sequences.map((sequence) => {
        const first = sequence.cells[0];
        const last = sequence.cells[4];
        const a = parse(first);
        const b = parse(last);
        return (
          <motion.line
            key={sequence.id}
            x1={a.x + 0.5}
            y1={a.y + 0.5}
            x2={b.x + 0.5}
            y2={b.y + 0.5}
            stroke="rgba(215, 173, 98, 0.55)"
            strokeWidth="0.12"
            strokeLinecap="round"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6 / (speed || 1) }}
          />
        );
      })}
    </svg>
  );
}

function parse(cellId: string): { x: number; y: number } {
  const match = /^r(\d+)c(\d+)$/.exec(cellId);
  return {
    x: match ? Number(match[2]) : 0,
    y: match ? Number(match[1]) : 0,
  };
}
