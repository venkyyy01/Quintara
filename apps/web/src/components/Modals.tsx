/**
 * Overlays and modals: victory (§48), pass-device handoff (§21), ambiguous
 * sequence selection (§66), reconnect status (§30) and settings (§62).
 */

"use client";

import { motion } from "framer-motion";
import type {
  ProjectedState,
  SequenceSelectionOption,
} from "@quintara/game-engine";
import { useSettings } from "@/lib/settings";
import { TeamBadge } from "./TeamMarker";

export function VictoryModal({
  projected,
  viewerId,
  onRematch,
  onQuit,
}: {
  projected: ProjectedState;
  viewerId: string | null;
  onRematch: () => void;
  onQuit: () => void;
}) {
  const winner = projected.teams.find((t) => t.id === projected.winnerTeamId);
  const isDraw = projected.resultType === "STALEMATE";
  const viewerWon =
    viewerId !== null &&
    projected.players.find((p) => p.id === viewerId)?.teamId ===
      projected.winnerTeamId;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Game result">
      <motion.div
        className="panel w-full max-w-md p-8 text-center"
        initial={{ scale: 0.92, opacity: 0, y: 18 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
      >
        <motion.h2
          className="text-4xl font-bold tracking-[0.12em]"
          style={{
            background: "linear-gradient(180deg, #f6d99a, var(--color-accent))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
          initial={{ letterSpacing: "0.3em", opacity: 0 }}
          animate={{ letterSpacing: "0.12em", opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          {isDraw ? "STALEMATE" : viewerWon ? "VICTORY" : "DEFEAT"}
        </motion.h2>

        {!isDraw && winner && (
          <p className="mt-3 flex items-center justify-center gap-2 text-lg">
            <TeamBadge teamId={winner.id} teamName={winner.name} size={20} />
            <span>
              {winner.name} completed{" "}
              {projected.requiredSequences}{" "}
              {projected.requiredSequences === 1 ? "line" : "lines"}
            </span>
          </p>
        )}
        {isDraw && (
          <p className="mt-3 text-text-secondary">
            No side could make progress — the game ends in a draw.
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 text-left text-xs text-secondary">
          <div className="rounded-lg bg-white/5 p-2.5">
            Turns played
            <p className="text-lg font-bold text-text-primary">
              {projected.turnNumber}
            </p>
          </div>
          <div className="rounded-lg bg-white/5 p-2.5">
            Duration
            <p className="text-lg font-bold text-text-primary">
              {formatDuration(projected)}
            </p>
          </div>
          {projected.teams.map((team) => (
            <div key={team.id} className="rounded-lg bg-white/5 p-2.5">
              {team.name} lines
              <p className="text-lg font-bold text-text-primary">
                {team.sequenceCount}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <button type="button" className="btn btn-primary" onClick={onRematch}>
            Rematch
          </button>
          <button type="button" className="btn btn-secondary" onClick={onQuit}>
            Return Home
          </button>
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

export function PassDeviceScreen({
  playerName,
  teamName,
  onReady,
}: {
  playerName: string;
  teamName: string;
  onReady: () => void;
}) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Pass device">
      <motion.div
        className="panel w-full max-w-sm p-8 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-3xl">
          🃏
        </div>
        <h2 className="text-xl font-bold">Pass device to {playerName}</h2>
        <p className="mt-2 text-sm text-secondary">
          Playing for <strong className="text-text-primary">{teamName}</strong>
        </p>
        <button
          type="button"
          className="btn btn-primary mt-6 w-full"
          onClick={onReady}
        >
          Tap when ready
        </button>
      </motion.div>
    </div>
  );
}

export function SequenceSelectionPanel({
  options,
  onSelect,
}: {
  options: readonly SequenceSelectionOption[];
  onSelect: (option: SequenceSelectionOption) => void;
}) {
  return (
    <div className="panel p-4" role="dialog" aria-label="Choose a line to claim">
      <h2 className="text-sm font-bold">
        Two lines are possible — choose which one to claim
      </h2>
      <p className="mt-1 text-xs text-secondary">
        The chosen line becomes protected. (§66)
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {options.map((option, index) => (
          <button
            key={option.optionId}
            type="button"
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

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useSettings();

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Settings">
      <motion.div
        className="panel w-full max-w-sm p-6"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h2 className="text-lg font-bold">Settings</h2>

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

        <button
          type="button"
          className="btn btn-primary mt-6 w-full"
          onClick={onClose}
        >
          Done
        </button>
      </motion.div>
    </div>
  );
}
