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
import { useLocalGame, type LocalSeat } from "@/lib/local-game";

const DIFFICULTIES: { id: AiDifficulty; label: string; hint: string }[] = [
  { id: "EASY", label: "Easy", hint: "Random moves with basic safety" },
  { id: "MEDIUM", label: "Medium", hint: "Tactical heuristics" },
  { id: "HARD", label: "Hard", hint: "Threat modelling & Jack discipline" },
  { id: "EXPERT", label: "Expert", hint: "Monte-Carlo style search" },
];

export default function LocalPlayPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-secondary">Loading…</div>}>
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

  const [mode, setMode] = useState<"SOLO" | "PASS_AND_PLAY" | null>(
    initialMode as "SOLO" | "PASS_AND_PLAY" | null,
  );
  const [difficulty, setDifficulty] = useState<AiDifficulty>(
    params.get("challenge") ? "HARD" : "MEDIUM",
  );
  const [playerCount, setPlayerCount] = useState(2);
  const [aiCount, setAiCount] = useState(1);
  const [names, setNames] = useState<string[]>(["You", "Rival"]);

  useEffect(() => {
    if (initialMode && !game.state) {
      // Auto-start quick play with defaults.
      if (params.get("quick")) {
        startGame("SOLO");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startGame(selected: "SOLO" | "PASS_AND_PLAY") {
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
    game.start({ mode: selected, seats, difficulty });
    setMode(selected);
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
          setAiCount(Math.max(1, count - 1));
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
  const activeSeat =
    mode === "SOLO"
      ? game.seats.find((s) => s.id === activeId)
      : game.seats.find((s) => s.id === activeId);

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
      lastPlacedCellId={null}
      lastMoveSummary={game.lastMoveSummary}
      botThinking={game.botThinking}
      handoff={{
        pending: game.awaitingHandoff,
        playerName: activeSeat?.name ?? "",
        teamName:
          projected.teams.find(
            (t) =>
              t.id ===
              projected.players.find((p) => p.id === activeId)?.teamId,
          )?.name ?? "",
        onReady: () => game.acknowledgeHandoff(),
      }}
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
    <main className="mx-auto w-full max-w-2xl px-6 pb-16 pt-[calc(var(--safe-top)+2rem)]">
      <button
        type="button"
        className="btn btn-ghost mb-6 px-2"
        onClick={props.onBack}
      >
        ← Back
      </button>
      <h1 className="text-3xl font-bold">New Game</h1>
      <p className="mt-1.5 text-secondary">
        Choose how to play. All local modes work offline.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {(
          [
            ["SOLO", "Play AI", "Face computer opponents"],
            ["PASS_AND_PLAY", "Pass & Play", "Share one device"],
          ] as const
        ).map(([id, label, hint]) => (
          <button
            key={id}
            type="button"
            className={`panel p-4 text-left transition ${
              mode === id ? "ring-2 ring-[var(--color-accent)]" : ""
            }`}
            onClick={() => props.setMode(id)}
          >
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
            {DIFFICULTIES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`panel px-3 py-3 text-center ${
                  props.difficulty === entry.id
                    ? "ring-2 ring-[var(--color-accent)]"
                    : ""
                }`}
                onClick={() => props.setDifficulty(entry.id)}
              >
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
