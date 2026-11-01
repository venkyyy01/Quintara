/**
 * Local play: solo vs AI (§21 SOLO) and pass-and-play (§21 LOCAL).
 * Runs the full deterministic engine in the browser — works offline (§33).
 */

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CellId, SequenceSelectionOption } from "@quintara/game-engine";
import type { AiDifficulty } from "@quintara/game-ai";
import { GameScreen } from "@/components/GameScreen";
import {
  dailyLabel,
  dailySeed,
  useLocalGame,
  type LocalSeat,
} from "@/lib/local-game";
import { withBasePath } from "@/lib/site";

const DIFFICULTIES: { id: AiDifficulty; label: string; hint: string }[] = [
  { id: "EASY", label: "Easy", hint: "Random moves with basic safety" },
  { id: "MEDIUM", label: "Medium", hint: "Tactical heuristics" },
  { id: "HARD", label: "Hard", hint: "Threat modelling & Jack discipline" },
  { id: "EXPERT", label: "Expert", hint: "Monte-Carlo style search" },
];

export default function LocalPlayPage() {
  return (
    <Suspense
      fallback={<div className="p-10 text-center text-secondary">Loading…</div>}
    >
      <LocalPlay />
    </Suspense>
  );
}

function LocalPlay() {
  const params = useSearchParams();
  const router = useRouter();
  const game = useLocalGame();

  const initialMode =
    params.get("mode") === "solo"
      ? "SOLO"
      : params.get("mode") === "pass"
        ? "PASS_AND_PLAY"
        : params.get("quick")
          ? "SOLO"
          : null;
  const isQuick = params.get("quick") !== null;
  const isChallenge = params.get("challenge") !== null;
  const dailyView = isChallenge || params.get("daily") !== null;

  const [mode, setMode] = useState<"SOLO" | "PASS_AND_PLAY" | null>(
    initialMode as "SOLO" | "PASS_AND_PLAY" | null,
  );
  const [difficulty, setDifficulty] = useState<AiDifficulty>(
    isChallenge ? "HARD" : "MEDIUM",
  );
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState<string[]>(["You", "Rival"]);

  useEffect(() => {
    if (isQuick || isChallenge) {
      // Quick play and the Daily Challenge both advertise a one-tap game.
      // The daily seed is identical for every player on the same local date.
      startGame("SOLO", isChallenge ? dailySeed() : undefined);
      return;
    }
    if (game.state) {
      if (!initialMode && game.mode) setMode(game.mode);
      return;
    }
    // Resume an interrupted match when the player opens local play directly.
    if (!initialMode) {
      const restored = game.hydrate();
      if (restored) setMode(restored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startGame(selected: "SOLO" | "PASS_AND_PLAY", seed?: string) {
    const seats: LocalSeat[] = [];
    if (selected === "SOLO") {
      seats.push({ id: "p-human", name: names[0] || "You", isAi: false });
      for (let i = 1; i < playerCount; i++) {
        seats.push({
          id: `p-ai-${i}`,
          name: names[i] || `AI ${i}`,
          isAi: true,
        });
      }
    } else {
      for (let i = 0; i < playerCount; i++) {
        seats.push({
          id: `p-${i + 1}`,
          name: names[i] || `Player ${i + 1}`,
          isAi: false,
        });
      }
    }
    game.start({ mode: selected, seats, difficulty, seed });
    setMode(selected);
    // Replace the one-shot start parameters so a reload resumes the match
    // instead of silently dealing a new one.
    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        withBasePath(seed ? "/play/local?daily=1" : "/play/local"),
      );
    }
  }

  const projected = game.projected;
  const state = game.state;

  const sequenceSelection = useMemo(() => {
    if (!projected || projected.turnPhase !== "AWAITING_SEQUENCE_SELECTION") {
      return null;
    }
    const options = projected.pendingSequenceOptions ?? [];
    return {
      options,
      onSelect: (option: SequenceSelectionOption) =>
        game.selectSequences([...option.sequences]),
      onUseDefault: () => game.useDefaultSequenceSelection(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projected?.turnPhase, projected?.pendingSequenceOptions]);

  // A finished local match leaves the engine state behind; without a
  // projection the screen would be blank — offer quick actions instead.
  if (state && !projected) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-3xl font-bold">Table ready</h1>
        <p className="max-w-sm text-secondary">
          The previous match has ended. Deal a fresh game or head back home.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => game.rematch()}
          >
            New Game
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              game.quit();
              router.push("/");
            }}
          >
            Home
          </button>
        </div>
      </main>
    );
  }

  if (!projected || !state || !mode) {
    return (
      <SetupScreen
        mode={mode}
        setMode={setMode}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        playerCount={playerCount}
        setPlayerCount={(count) => {
          setPlayerCount(count);
          setNames((prev) => {
            const next = [...prev];
            while (next.length < count) next.push("");
            return next.slice(0, count);
          });
        }}
        names={names}
        setNames={setNames}
        onStart={startGame}
        onBack={() => router.push("/")}
      />
    );
  }

  const activeId = projected.currentTurnPlayerId;

  return (
    <GameScreen
      projected={projected}
      authoritativeState={state}
      viewerId={
        mode === "SOLO"
          ? (game.seats.find((s) => !s.isAi)?.id ?? null)
          : activeId
      }
      selectedCardId={game.selectedCardId}
      lastPlacedCellId={game.lastPlacedCellId}
      lastMoveSummary={game.lastMoveSummary}
      botThinking={game.botThinking}
      notices={game.toasts}
      onDismissNotice={(id) => game.dismissToast(Number(id))}
      neutralResult={mode === "PASS_AND_PLAY"}
      connectionLabel={dailyView ? `Daily Challenge · ${dailyLabel()}` : null}
      sequenceSelection={sequenceSelection}
      onSelectCard={(cardId) => game.selectCard(cardId)}
      onCellClick={(cellId: CellId) => game.playAt(cellId)}
      onExchange={(cardId) => game.exchangeDeadCard(cardId)}
      onRematch={() => game.rematch()}
      onQuit={() => {
        game.quit();
        router.push("/");
      }}
    />
  );
}

function SetupScreen(props: {
  mode: "SOLO" | "PASS_AND_PLAY" | null;
  setMode: (mode: "SOLO" | "PASS_AND_PLAY") => void;
  difficulty: AiDifficulty;
  setDifficulty: (difficulty: AiDifficulty) => void;
  playerCount: number;
  setPlayerCount: (count: number) => void;
  names: string[];
  setNames: (names: string[]) => void;
  onStart: (mode: "SOLO" | "PASS_AND_PLAY") => void;
  onBack: () => void;
}) {
  const counts = [2, 3, 4, 6, 8, 9, 10, 12];
  const mode = props.mode ?? "SOLO";

  return (
    <main className="relative mx-auto w-full max-w-2xl px-6 pb-16 pt-[calc(var(--safe-top)+2rem)]">
      <button
        type="button"
        className="btn btn-ghost mb-6 px-2"
        onClick={props.onBack}
      >
        ← Back
      </button>
      <span className="hero-eyebrow">
        <span className="dot" aria-hidden />
        Local table
      </span>
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">New Game</h1>
      <p className="mt-1.5 text-secondary">
        Choose how to play. All local modes work offline.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {(
          [
            ["SOLO", "Play AI", "Face computer opponents", "🤖"],
            ["PASS_AND_PLAY", "Pass & Play", "Share one device", "👥"],
          ] as const
        ).map(([id, label, hint, icon]) => (
          <button
            key={id}
            type="button"
            className={`panel choice-card p-4 ${
              mode === id ? "is-selected" : ""
            }`}
            onClick={() => props.setMode(id)}
            aria-pressed={mode === id}
          >
            <span className="mb-2 inline-grid h-9 w-9 place-items-center rounded-[10px] border border-white/8 bg-white/5 text-lg">
              {icon}
            </span>
            <p className="font-semibold">{label}</p>
            <p className="mt-1 text-xs text-secondary">{hint}</p>
          </button>
        ))}
      </div>

      {mode === "SOLO" && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
            Difficulty
          </h2>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {DIFFICULTIES.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                className={`panel choice-card px-3 py-3 text-center ${
                  props.difficulty === entry.id ? "is-selected" : ""
                }`}
                onClick={() => props.setDifficulty(entry.id)}
                aria-pressed={props.difficulty === entry.id}
              >
                <span
                  className="mb-1.5 flex justify-center gap-0.5"
                  aria-hidden
                >
                  {Array.from({ length: 4 }).map((_, bar) => (
                    <span
                      key={bar}
                      className={`h-1 w-2.5 rounded-full ${
                        bar <= index
                          ? "bg-gradient-to-r from-[#f6dda6] to-accent"
                          : "bg-white/10"
                      }`}
                    />
                  ))}
                </span>
                <p className="text-sm font-semibold">{entry.label}</p>
                <p className="mt-1 text-[0.66rem] leading-tight text-secondary">
                  {entry.hint}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
          Players
        </h2>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {counts.map((count) => (
            <button
              key={count}
              type="button"
              className={`btn ${props.playerCount === count ? "btn-primary" : "btn-secondary"} px-4`}
              onClick={() => props.setPlayerCount(count)}
            >
              {count}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-secondary">
          Standard counts only (§4): 2, 3, 4, 6, 8, 9, 10 or 12 players.
        </p>
        {props.playerCount === 3 && (
          <p
            className="mt-2 rounded-[10px] border border-[rgba(215,173,98,0.35)] bg-accent-soft px-3 py-2 text-xs text-secondary"
            role="note"
          >
            <strong className="text-text-primary">3-player note:</strong> three
            teams share the board and games often end in a draw. 2, 4 or 6
            players give the most decisive matches.
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
          Names
        </h2>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {Array.from({ length: props.playerCount }).map((_, index) => (
            <input
              key={index}
              type="text"
              value={props.names[index] ?? ""}
              placeholder={
                mode === "SOLO"
                  ? index === 0
                    ? "Your name"
                    : `AI ${index}`
                  : `Player ${index + 1}`
              }
              onChange={(e) => {
                const next = [...props.names];
                next[index] = e.target.value;
                props.setNames(next);
              }}
              className="rounded-[10px] border border-white/10 bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
              aria-label={`Name for seat ${index + 1}`}
            />
          ))}
        </div>
      </section>

      <button
        type="button"
        className="btn btn-primary mt-8 w-full py-4 text-lg"
        onClick={() => props.onStart(mode)}
      >
        Start Game
      </button>
    </main>
  );
}
