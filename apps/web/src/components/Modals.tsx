/**
 * Overlays and modals: victory (§48), ambiguous sequence selection (§66),
 * reconnect status (§30) and settings (§62).
 */

"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type {
  ProjectedState,
  SequenceSelectionOption,
} from "@quintara/game-engine";
import { clearLocalData, useSettings } from "@/lib/settings";
import { TeamBadge } from "./TeamMarker";

const CONFETTI_COLORS = [
  "#d7ad62",
  "#f6dda6",
  "#3f83f8",
  "#4fc18c",
  "#ef5350",
  "#e3b341",
];

const CONFETTI = Array.from({ length: 30 }, (_, index) => ({
  x: `${(index * 37 + 11) % 100}%`,
  drift: `${((index * 53) % 130) - 65}px`,
  delay: `${(index % 10) * 0.07}s`,
  duration: `${2.4 + (index % 6) * 0.22}s`,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length] ?? "#d7ad62",
}));

/**
 * Modal focus management: initial focus, Tab/Shift+Tab containment, Escape
 * handling and focus restoration. Every overlay uses this so keyboard and
 * screen-reader users are never stranded behind a dialog.
 */
function useDialogFocus(
  onClose?: () => void,
  enabled = true,
): React.RefObject<HTMLDivElement | null> {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const panel = panelRef.current;
    if (!panel) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusable = (): HTMLElement[] =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);

    (focusable()[0] ?? panel).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeRef.current) {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0] as HTMLElement;
      const last = items[items.length - 1] as HTMLElement;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [enabled]);

  return panelRef;
}

export function VictoryModal({
  projected,
  viewerId,
  onRematch,
  onQuit,
  hideRematch = false,
  neutralResult = false,
}: {
  projected: ProjectedState;
  viewerId: string | null;
  onRematch: () => void;
  onQuit: () => void;
  /** Online rooms: only the host can trigger the rematch (§30). */
  hideRematch?: boolean;
  /** Pass-and-play: the device is shared, so never call a side the loser. */
  neutralResult?: boolean;
}) {
  const winner = projected.teams.find((t) => t.id === projected.winnerTeamId);
  const isDraw = projected.resultType === "STALEMATE";
  const viewerWon =
    viewerId !== null &&
    projected.players.find((p) => p.id === viewerId)?.teamId ===
      projected.winnerTeamId;
  const titleId = useId();
  const panelRef = useDialogFocus(onQuit);
  const reduced = useReducedMotion();
  const showCelebration = !isDraw && !reduced;

  return (
    <div className="overlay">
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="panel panel-gold victory-panel w-full max-w-md p-7 text-center sm:p-8"
        initial={{ scale: 0.9, opacity: 0, y: 26, rotateX: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
      >
        {showCelebration && (
          <div className="victory-burst" aria-hidden>
            {CONFETTI.map((piece, index) => (
              <span
                key={index}
                className="confetti"
                style={
                  {
                    "--confetti-x": piece.x,
                    "--confetti-drift": piece.drift,
                    "--confetti-delay": piece.delay,
                    "--confetti-duration": piece.duration,
                    "--confetti-color": piece.color,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        )}

        <div className="relative z-10">
          <motion.div
            className="trophy-ring"
            initial={reduced ? false : { scale: 0.5, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 240, damping: 16 }}
          >
            <span aria-hidden>{isDraw ? "⚖" : viewerWon || neutralResult ? "🏆" : "🛡"}</span>
          </motion.div>

          <motion.h2
            id={titleId}
            className="text-4xl font-bold tracking-[0.12em]"
            style={{
              background:
                "linear-gradient(180deg, #f8e3b2, var(--color-accent) 65%, #a97f36)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 8px 22px rgba(215, 173, 98, 0.3))",
            }}
            initial={{ letterSpacing: "0.3em", opacity: 0 }}
            animate={{ letterSpacing: "0.12em", opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            {isDraw
              ? "STALEMATE"
              : neutralResult
                ? `${winner?.name ?? "WINNER"} WINS`
                : viewerWon
                  ? "VICTORY"
                  : "DEFEAT"}
          </motion.h2>

          {!isDraw && winner && (
            <p className="mt-3 flex items-center justify-center gap-2 text-lg">
              <TeamBadge teamId={winner.id} teamName={winner.name} size={20} />
              <span>
                {winner.name} completed {projected.requiredSequences}{" "}
                {projected.requiredSequences === 1 ? "line" : "lines"}
              </span>
            </p>
          )}
          {isDraw && (
            <p className="mt-3 text-text-secondary">
              No side could make progress — the game ends in a draw.
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2 text-left text-xs text-secondary">
            <div className="rounded-xl border border-white/6 bg-white/[0.04] p-2.5">
              Turns played
              <p className="text-lg font-bold text-text-primary">
                {projected.turnNumber}
              </p>
            </div>
            <div className="rounded-xl border border-white/6 bg-white/[0.04] p-2.5">
              Duration
              <p className="text-lg font-bold text-text-primary">
                {formatDuration(projected)}
              </p>
            </div>
            {projected.teams.map((team) => (
              <div
                key={team.id}
                className="rounded-xl border border-white/6 bg-white/[0.04] p-2.5"
              >
                {team.name} lines
                <p className="text-lg font-bold text-text-primary">
                  {team.sequenceCount}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {hideRematch ? (
              <p className="w-full text-center text-xs text-secondary">
                Waiting for the host to start the rematch…
              </p>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onRematch}
              >
                Rematch
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onQuit}>
              Return Home
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function formatDuration(projected: ProjectedState): string {
  if (!projected.finishedAt) return "—";
  const start = new Date(projected.createdAt).getTime();
  const end = new Date(projected.finishedAt).getTime();
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function SequenceSelectionPanel({
  options,
  onSelect,
  onUseDefault,
  disabled = false,
}: {
  options: readonly SequenceSelectionOption[];
  onSelect: (option: SequenceSelectionOption) => void;
  onUseDefault?: () => void;
  disabled?: boolean;
}) {
  const titleId = useId();
  return (
    <div
      className="panel p-4"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className="text-sm font-bold">
        {options.length > 1
          ? "Two lines are possible — choose which one to claim"
          : "Choose a line to claim"}
      </h2>
      <p className="mt-1 text-xs text-secondary">
        The chosen line becomes protected. (§66)
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {options.map((option, index) => (
          <button
            key={option.optionId}
            type="button"
            autoFocus={index === 0}
            disabled={disabled}
            className="btn btn-secondary justify-start text-left"
            onClick={() => onSelect(option)}
          >
            <span className="font-semibold">Option {index + 1}:</span>
            <span className="text-xs text-secondary">
              {option.sequences
                .map((s) =>
                  s.cells
                    .map((c) => c.replace("r", "R").replace("c", "C"))
                    .join(" → "),
                )
                .join("  +  ")}
            </span>
          </button>
        ))}
      </div>
      {onUseDefault && (
        <button
          type="button"
          disabled={disabled}
          className="btn btn-ghost mt-2 w-full text-xs"
          onClick={onUseDefault}
        >
          Use the automatic tie-break
        </button>
      )}
    </div>
  );
}

export function ReconnectOverlay({ message }: { message: string }) {
  return (
    <div
      className="fixed inset-x-0 top-0 z-40 flex justify-center pt-[calc(var(--safe-top)+0.75rem)]"
      role="status"
      aria-live="polite"
    >
      <div className="toast flex items-center gap-2.5">
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        {message}
      </div>
    </div>
  );
}

export function SettingsPanel({
  onClose,
  inline = false,
}: {
  onClose: () => void;
  /** Embedded in the settings page instead of a modal overlay. */
  inline?: boolean;
}) {
  const settings = useSettings();
  const titleId = useId();
  const panelRef = useDialogFocus(onClose, !inline);

  const panel = (
    <motion.div
      ref={panelRef}
      tabIndex={inline ? undefined : -1}
      role={inline ? undefined : "dialog"}
      aria-modal={inline ? undefined : true}
      aria-labelledby={titleId}
      className={`panel w-full max-w-sm p-6 ${inline ? "max-w-none" : ""}`}
      initial={inline ? false : { opacity: 0, scale: 0.96 }}
      animate={inline ? undefined : { opacity: 1, scale: 1 }}
    >
        <h2 id={titleId} className="text-lg font-bold">
          Settings
        </h2>

        <label className="mt-4 block text-sm">
          Master volume
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.masterVolume}
            onChange={(e) =>
              settings.update({ masterVolume: Number(e.target.value) })
            }
            className="mt-1.5 w-full accent-[var(--color-accent)]"
          />
        </label>

        <label className="mt-3 block text-sm">
          Effects
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.effectsVolume}
            onChange={(e) =>
              settings.update({ effectsVolume: Number(e.target.value) })
            }
            className="mt-1.5 w-full accent-[var(--color-accent)]"
          />
        </label>

        <label className="mt-3 block text-sm">
          Music
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.musicVolume}
            onChange={(e) =>
              settings.update({ musicVolume: Number(e.target.value) })
            }
            className="mt-1.5 w-full accent-[var(--color-accent)]"
          />
        </label>

        <label className="mt-4 flex items-center justify-between text-sm">
          Haptics
          <input
            type="checkbox"
            checked={settings.haptics}
            onChange={(e) => settings.update({ haptics: e.target.checked })}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
        </label>

        <label className="mt-2.5 flex items-center justify-between text-sm">
          Highlight legal moves
          <input
            type="checkbox"
            checked={settings.showLegalMoves}
            onChange={(e) =>
              settings.update({ showLegalMoves: e.target.checked })
            }
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
        </label>

        <fieldset className="mt-4">
          <legend className="text-sm">Animation speed</legend>
          <div className="mt-1.5 flex gap-2">
            {([1, 1.5, 2] as const).map((speed) => (
              <button
                key={speed}
                type="button"
                className={`btn flex-1 ${settings.animationSpeed === speed ? "btn-primary" : "btn-secondary"}`}
                onClick={() => settings.update({ animationSpeed: speed })}
              >
                {speed === 1 ? "Normal" : speed === 1.5 ? "Fast" : "Instant"}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="text-sm">Motion</legend>
          <div className="mt-1.5 flex gap-2">
            {(
              [
                [null, "System"],
                [true, "Reduced"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={settings.reducedMotion === value}
                className={`btn flex-1 px-2 text-xs ${settings.reducedMotion === value ? "btn-primary" : "btn-secondary"}`}
                onClick={() => settings.update({ reducedMotion: value })}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-secondary">
            Reduced disables marker drops, card lifts and animated line traces.
          </p>
        </fieldset>

        <div className="mt-5 border-t border-white/8 pt-4">
          <button
            type="button"
            className="btn btn-ghost w-full text-xs"
            onClick={() => settings.reset()}
          >
            Reset settings to defaults
          </button>
          <button
            type="button"
            className="btn btn-ghost mt-1 w-full text-xs text-[var(--color-danger)]"
            onClick={() => {
              if (
                window.confirm(
                  "Delete this device’s saved games, stats, settings and guest session? This cannot be undone.",
                )
              ) {
                clearLocalData();
                window.location.reload();
              }
            }}
          >
            Clear local data…
          </button>
        </div>

        {!inline && (
          <button
            type="button"
            className="btn btn-primary mt-6 w-full"
            onClick={onClose}
          >
            Done
          </button>
        )}
      </motion.div>
  );

  if (inline) {
    return <section aria-labelledby={titleId}>{panel}</section>;
  }

  return <div className="overlay">{panel}</div>;
}
