/**
 * Side panels: players with team/sequence counters, turn indicator (§55) and
 * match information (§35). Turn is communicated with text + ring, never
 * animation alone.
 */

"use client";

import type { ProjectedState } from "@quintara/game-engine";
import { TeamBadge } from "./TeamMarker";

export function PlayersPanel({
  projected,
  viewerId,
}: {
  projected: ProjectedState;
  viewerId: string | null;
}) {
  return (
    <section className="panel p-4" aria-label="Players">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
        Players
      </h2>
      <ul className="flex flex-col gap-2.5">
        {projected.players.map((player) => {
          const team = projected.teams.find((t) => t.id === player.teamId);
          const sequenceCount = team?.sequenceCount ?? 0;
          return (
            <li
              key={player.id}
              className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 ${
                player.isCurrentPlayer
                  ? "bg-accent-soft ring-1 ring-[rgba(215,173,98,0.45)]"
                  : ""
              }`}
            >
              <TeamBadge teamId={player.teamId} teamName={team?.name ?? ""} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {player.name}
                  {player.id === viewerId && (
                    <span className="ml-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-accent">
                      You
                    </span>
                  )}
                </p>
                <p className="text-[0.68rem] text-secondary">
                  {team?.name} · {sequenceCount}{" "}
                  {sequenceCount === 1 ? "line" : "lines"} ·{" "}
                  {player.cardCount} {player.cardCount === 1 ? "card" : "cards"}
                </p>
              </div>
              {player.isCurrentPlayer && (
                <span
                  className="text-[0.62rem] font-bold uppercase tracking-wider text-accent"
                  aria-label="Current turn"
                >
                  ▶
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t border-white/8 pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
          Goal
        </h3>
        <p className="text-[0.72rem] text-secondary">
          Complete{" "}
          <strong className="text-text-primary">
            {projected.requiredSequences}{" "}
            {projected.requiredSequences === 1 ? "line" : "lines"}
          </strong>{" "}
          of five to win.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {projected.teams.map((team) => (
            <span
              key={team.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[0.68rem]"
            >
              <TeamBadge teamId={team.id} teamName={team.name} size={12} />
              {team.name}: {team.sequenceCount}/{projected.requiredSequences}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MatchInfo({
  projected,
  turnLabel,
  lastMoveSummary,
  round,
}: {
  projected: ProjectedState;
  turnLabel: string;
  lastMoveSummary: string | null;
  round: number;
}) {
  return (
    <section className="panel p-4" aria-label="Match information">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
        Match
      </h2>
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-secondary">Draw pile</dt>
          <dd className="font-semibold">{projected.drawPileCount}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-secondary">Turn</dt>
          <dd className="font-semibold">{projected.turnNumber}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-secondary">Round</dt>
          <dd className="font-semibold">{round}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-secondary">Turn owner</dt>
          <dd className="max-w-[55%] truncate font-semibold">{turnLabel}</dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-white/8 pt-3">
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
          Last move
        </h3>
        <p className="min-h-[2.2em] text-[0.78rem] text-text-primary">
          {lastMoveSummary ?? "—"}
        </p>
      </div>

      <div className="mt-4 border-t border-white/8 pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
          Discards
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(projected.discardPiles).map(([playerId, codes]) => {
            const player = projected.players.find((p) => p.id === playerId);
            return (
              <span
                key={playerId}
                className="rounded-md bg-white/5 px-2 py-1 text-[0.66rem] text-secondary"
                title={codes.join(", ")}
              >
                {player?.name ?? playerId}: {codes.length}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function TurnBanner({
  projected,
  viewerId,
  botThinking,
  turnTimer,
}: {
  projected: ProjectedState;
  viewerId: string | null;
  botThinking: boolean;
  turnTimer?: { remainingMs: number; totalMs: number } | null;
}) {
  const current = projected.players.find((p) => p.isCurrentPlayer);
  const isYours = current?.id === viewerId && viewerId !== null;
  const team = projected.teams.find((t) => t.id === current?.teamId);

  const text = projected.status
    ? projected.status === "FINISHED"
      ? "Game over"
      : isYours
        ? "YOUR TURN"
        : botThinking
          ? `${current?.name ?? "Opponent"} is thinking…`
          : `${current?.name ?? "Opponent"}'s turn`
    : "";

  const remainingSeconds =
    turnTimer && turnTimer.totalMs > 0
      ? Math.max(0, Math.ceil(turnTimer.remainingMs / 1000))
      : null;
  const timerRatio =
    turnTimer && turnTimer.totalMs > 0
      ? Math.max(0, Math.min(1, turnTimer.remainingMs / turnTimer.totalMs))
      : 0;
  const timerUrgent = remainingSeconds !== null && remainingSeconds <= 10;

  return (
    <div
      className={`flex items-center gap-3 rounded-full px-4 py-2 ${
        isYours
          ? "bg-accent-soft ring-1 ring-[rgba(215,173,98,0.5)]"
          : "bg-white/5"
      }`}
    >
      {current && (
        <TeamBadge teamId={current.teamId} teamName={team?.name ?? ""} size={16} />
      )}
      <span
        className={`text-sm font-bold tracking-wide ${
          isYours ? "text-accent" : "text-text-primary"
        }`}
        role="status"
        aria-live="polite"
      >
        {text}
      </span>
      {remainingSeconds !== null && projected.status === "ACTIVE" && (
        <span
          className={`flex items-center gap-1.5 text-xs font-semibold tabular-nums ${
            timerUrgent ? "text-[var(--color-danger)]" : "text-secondary"
          }`}
          aria-hidden="true"
          title={`${remainingSeconds} seconds left in this turn`}
        >
          <span className="relative h-1.5 w-10 overflow-hidden rounded-full bg-white/10">
            <span
              className={`absolute inset-y-0 left-0 rounded-full ${
                timerUrgent ? "bg-[var(--color-danger)]" : "bg-accent"
              }`}
              style={{ width: `${Math.round(timerRatio * 100)}%` }}
            />
          </span>
          {remainingSeconds}s
        </span>
      )}
    </div>
  );
}
