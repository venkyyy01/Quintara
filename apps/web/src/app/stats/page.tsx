/**
 * Local stats and match history. Everything is stored on this device; no
 * account or server is involved.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  loadLocalStats,
  type LocalGameRecord,
  type LocalStats,
} from "@/lib/local-game";

const EMPTY: LocalStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  bestStreak: 0,
  history: [],
};

export default function StatsPage() {
  const [stats, setStats] = useState<LocalStats>(EMPTY);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStats(loadLocalStats());
    setMounted(true);
  }, []);

  const soloGames = stats.wins + stats.losses + stats.draws;
  const winRate = soloGames > 0 ? Math.round((stats.wins / soloGames) * 100) : 0;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 pb-16 pt-[calc(var(--safe-top)+2rem)]">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Stats</h1>
        <Link href="/" className="btn btn-ghost">
          ← Home
        </Link>
      </div>
      <p className="mt-1.5 text-sm text-secondary">
        Saved on this device only. Online matches are not included.
      </p>

      {!mounted ? (
        <div className="panel mt-6 h-48 animate-pulse" />
      ) : stats.gamesPlayed === 0 ? (
        <section className="panel mt-6 p-8 text-center">
          <p className="text-4xl" aria-hidden>
            ◈
          </p>
          <h2 className="mt-3 text-lg font-semibold">No games yet</h2>
          <p className="mt-1.5 text-sm text-secondary">
            Finish a solo or pass-and-play match and it will show up here.
          </p>
          <Link
            href="/play/local?quick=1"
            className="btn btn-primary mt-5 px-6 py-3"
          >
            Play a game
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Games" value={stats.gamesPlayed} />
            <StatCard label="Solo win rate" value={`${winRate}%`} />
            <StatCard label="Current streak" value={stats.currentStreak} />
            <StatCard label="Best streak" value={stats.bestStreak} />
          </section>

          <section className="panel mt-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
              Solo record
            </h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-white/5 px-3 py-1">
                {stats.wins} wins
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1">
                {stats.losses} losses
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1">
                {stats.draws} draws
              </span>
            </div>
          </section>

          <section className="panel mt-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
              Recent matches
            </h2>
            <ul className="mt-3 flex flex-col divide-y divide-white/8">
              {stats.history.map((record) => (
                <HistoryRow key={`${record.id}-${record.finishedAt}`} record={record} />
              ))}
            </ul>
          </section>

          <button
            type="button"
            className="btn btn-ghost mt-6 text-xs"
            onClick={() => {
              if (
                window.confirm(
                  "Delete local stats and match history from this device?",
                )
              ) {
                window.localStorage.removeItem("quintara-local-stats-v1");
                setStats(EMPTY);
              }
            }}
          >
            Clear local stats
          </button>
        </>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function HistoryRow({ record }: { record: LocalGameRecord }) {
  const label =
    record.result === "COMPLETE"
      ? `${record.winnerName ?? "Winner"} won`
      : record.result === "WIN"
        ? "Victory"
        : record.result === "LOSS"
          ? "Defeat"
          : "Draw";
  const tone =
    record.result === "WIN"
      ? "text-success"
      : record.result === "LOSS"
        ? "text-[var(--color-danger)]"
        : "text-accent";
  return (
    <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className={`font-semibold ${tone}`}>{label}</p>
        <p className="truncate text-xs text-secondary">
          {record.mode === "SOLO"
            ? `Solo · ${titleCase(record.difficulty)}`
            : "Pass & play"}{" "}
          · {record.turns} turns · {formatDuration(record.durationMs)}
        </p>
      </div>
      <time
        className="shrink-0 text-xs text-secondary"
        dateTime={record.finishedAt}
      >
        {new Date(record.finishedAt).toLocaleDateString()}
      </time>
    </li>
  );
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
