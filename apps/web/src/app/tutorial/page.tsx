/**
 * Interactive tutorial (§67): ten scripted lessons played on real engine
 * states — the tutorial teaches actual rules behaviour, not approximations.
 */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  applyCommand,
  cellId,
  currentPlayerId,
  engineErrorMessage,
  EngineError,
  projectStateForViewer,
  resolveSequenceSelectionDefault,
  scenario,
  type GameCommand,
  type GameState,
} from "@quintara/game-engine";
import { GameBoard } from "@/components/GameBoard";
import { PlayingCard } from "@/components/PlayingCard";

interface Lesson {
  title: string;
  instruction: string;
  build: () => GameState;
  /** Returns true when the performed command fulfils the lesson. */
  isComplete: (before: GameState, command: GameCommand, after: GameState) => boolean;
}

function coords(state: GameState, code: string) {
  const cell = state.boardDefinition.cells.find(
    (c) => c.type === "CARD" && c.cardCode === code,
  )!;
  return { row: cell.row, column: cell.column };
}

function allCoords(state: GameState, code: string) {
  return state.boardDefinition.cells
    .filter((c) => c.type === "CARD" && c.cardCode === code)
    .map((c) => ({ row: c.row, column: c.column }));
}

/**
 * Builds a state where Red has already completed a line, so those markers are
 * protected. The completion is produced by a real engine command rather than
 * by hand-writing sequence metadata.
 */
function buildProtectedLineState(): GameState {
  const base = scenario()
    .withCurrentPlayer("B")
    .withHand("B", ["5H"])
    .withHand("A", ["JH"])
    .withMarker("B", 2, 3)
    .withMarker("B", 2, 4)
    .withMarker("B", 2, 5)
    .withMarker("B", 2, 6)
    .withMarker("B", 7, 7)
    .build();
  const target = coords(base, "5H");
  const cardId = base.hands["p-B"]?.[0];
  if (!cardId) throw new Error("Tutorial setup is missing Red's card");
  const played = applyCommand(base, {
    type: "PLAY_NORMAL_CARD",
    playerId: "p-B",
    actionId: "tutorial-protected-setup",
    expectedVersion: base.version,
    cardId,
    targetCellId: cellId(target.row, target.column),
  }).state;
  if (played.turnPhase !== "AWAITING_SEQUENCE_SELECTION") return played;
  return applyCommand(played, {
    type: "SELECT_SEQUENCE_SET",
    playerId: "p-B",
    actionId: "tutorial-protected-select",
    expectedVersion: played.version,
    sequenceCellSets: resolveSequenceSelectionDefault(played).map((s) => [
      ...s.cells,
    ]),
  }).state;
}

const LESSONS: Lesson[] = [
  {
    title: "Play a normal card",
    instruction:
      "You hold 8♥. Select it, then tap one of the two highlighted 8♥ spaces to place your marker.",
    build: () =>
      scenario()
        .withCurrentPlayer("A")
        .withHand("A", ["8H"])
        .withHand("B", ["2C"])
        .build(),
    isComplete: (_b, command) => command.type === "PLAY_NORMAL_CARD",
  },
  {
    title: "Choose between duplicates",
    instruction:
      "One 8♥ space is already occupied. Play 8♥ on the only open copy — the highlighted cell.",
    build: () => {
      const pre = scenario().build();
      const { row, column } = coords(pre, "8H");
      return scenario()
        .withCurrentPlayer("A")
        .withHand("A", ["8H"])
        .withHand("B", ["2C"])
        .withMarker("B", row, column)
        .build();
    },
    isComplete: (before, command) => {
      if (command.type !== "PLAY_NORMAL_CARD") return false;
      const open = allCoords(before, "8H").filter(
        (c) => !before.board.cells[cellId(c.row, c.column)]?.occupantTeamId,
      );
      return open.some(
        (c) => cellId(c.row, c.column) === command.targetCellId,
      );
    },
  },
  {
    title: "Complete a line",
    instruction:
      "Four of your markers are ready. Use the Two-Eyed Jack (J♣) on the highlighted space to complete five in a row.",
    build: () =>
      scenario()
        .withCurrentPlayer("A")
        .withHand("A", ["JC"])
        .withHand("B", ["2C"])
        .withMarker("A", 5, 1)
        .withMarker("A", 5, 2)
        .withMarker("A", 5, 3)
        .withMarker("A", 5, 4)
        .build(),
    isComplete: (_b, _c, after) =>
      (after.completedSequences["team-1"] ?? []).length > 0,
  },
  {
    title: "Use the wild corner",
    instruction:
      "Golden corners count for every team. Complete a line through the top-left corner with your J♣.",
    build: () =>
      scenario()
        .withCurrentPlayer("A")
        .withHand("A", ["JC"])
        .withHand("B", ["2C"])
        .withMarker("A", 0, 1)
        .withMarker("A", 0, 2)
        .withMarker("A", 0, 3)
        .build(),
    isComplete: (_b, _c, after) =>
      (after.completedSequences["team-1"] ?? []).length > 0,
  },
  {
    title: "Two-Eyed Jack",
    instruction:
      "J♣ and J♦ are wild: place a marker on ANY open space. Try it — pick the highlighted centre space.",
    build: () =>
      scenario()
        .withCurrentPlayer("A")
        .withHand("A", ["JD"])
        .withHand("B", ["2C"])
        .build(),
    isComplete: (_b, command) => command.type === "PLAY_WILD_JACK",
  },
  {
    title: "One-Eyed Jack",
    instruction:
      "J♥ removes an opponent marker. Tap the red marker to remove it — you will not place your own this turn.",
    build: () =>
      scenario()
        .withCurrentPlayer("A")
        .withHand("A", ["JH"])
        .withHand("B", ["2C"])
        .withMarker("B", 5, 5)
        .build(),
    isComplete: (_b, command) => command.type === "PLAY_REMOVE_JACK",
  },
  {
    title: "Protected lines",
    instruction:
      "The opponent completed a line — its markers are protected. Try tapping a protected marker: the game will refuse. Then remove the free red marker instead.",
    build: () => buildProtectedLineState(),
    isComplete: (_b, command) =>
      command.type === "PLAY_REMOVE_JACK" && command.targetCellId === "r7c7",
  },
  {
    title: "Exchange a dead card",
    instruction:
      "Both 8♥ spaces are occupied — the card is dead. Tap Exchange to swap it for a fresh card (once per turn), then play on.",
    build: () => {
      const pre = scenario().build();
      const copies = allCoords(pre, "8H");
      const first = copies[0]!;
      const second = copies[1]!;
      return scenario()
        .withCurrentPlayer("A")
        .withHand("A", ["8H"])
        .withHand("B", ["2C"])
        .withMarker("A", first.row, first.column)
        .withMarker("B", second.row, second.column)
        .build();
    },
    isComplete: (_b, command) => command.type === "EXCHANGE_DEAD_CARD",
  },
  {
    title: "Block the opponent",
    instruction:
      "Red threatens to complete five in a row at the highlighted space. Beat them to it: place your marker there with J♣.",
    build: () =>
      scenario()
        .withCurrentPlayer("A")
        .withHand("A", ["JC"])
        .withHand("B", ["2C"])
        .withMarker("B", 3, 1)
        .withMarker("B", 3, 2)
        .withMarker("B", 3, 3)
        .withMarker("B", 3, 4)
        .build(),
    isComplete: (_b, command, after) =>
      command.type === "PLAY_WILD_JACK" &&
      command.targetCellId === "r3c5" &&
      (after.completedSequences["team-2"] ?? []).length === 0,
  },
  {
    title: "Create a double threat",
    instruction:
      "Place J♣ at the crossing point to open two line threats at once — the classic winning setup.",
    build: () =>
      scenario()
        .withCurrentPlayer("A")
        .withHand("A", ["JC"])
        .withHand("B", ["2C"])
        .withMarker("A", 5, 2)
        .withMarker("A", 5, 3)
        .withMarker("A", 5, 4)
        .withMarker("A", 2, 5)
        .withMarker("A", 3, 5)
        .withMarker("A", 4, 5)
        .build(),
    isComplete: (_b, command) =>
      command.type === "PLAY_WILD_JACK" && command.targetCellId === "r5c5",
  },
];

export default function TutorialPage() {
  const [index, setIndex] = useState(0);
  const lesson = LESSONS[index] as Lesson;
  const [state, setState] = useState<GameState>(() => lesson.build());
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const projected = useMemo(
    () => projectStateForViewer(state, currentPlayerId(state)),
    [state],
  );

  function restart(nextIndex = index) {
    const nextLesson = LESSONS[nextIndex] as Lesson;
    setState(nextLesson.build());
    setSelectedCardId(null);
    setFeedback(null);
    setDone(false);
    setIndex(nextIndex);
  }

  const legalTargets = useMemo(() => {
    const set = new Set<string>();
    for (const action of projected.legalActions?.mainActions ?? []) {
      if (
        !selectedCardId ||
        (action.cardId === selectedCardId &&
          action.type !== "PLAY_REMOVE_JACK")
      ) {
        set.add(action.targetCellId);
      }
    }
    return set;
  }, [projected.legalActions, selectedCardId]);

  const removableTargets = useMemo(() => {
    const set = new Set<string>();
    for (const action of projected.legalActions?.mainActions ?? []) {
      if (action.cardId === selectedCardId && action.type === "PLAY_REMOVE_JACK") {
        set.add(action.targetCellId);
      }
    }
    return set;
  }, [projected.legalActions, selectedCardId]);

  function perform(command: GameCommand) {
    const before = state;
    try {
      const result = applyCommand(before, command);
      setState(result.state);
      if (lesson.isComplete(before, command, result.state)) {
        setDone(true);
        setFeedback("✓ Lesson complete!");
      } else if (command.type === "EXCHANGE_DEAD_CARD") {
        setFeedback("Card exchanged — now play your main action.");
      } else {
        setFeedback("Move made. Keep going.");
      }
    } catch (error) {
      if (error instanceof EngineError) {
        setFeedback(engineErrorMessage(error.code));
      }
    }
    setSelectedCardId(null);
  }

  function onCellClick(cellId: string) {
    const action = (projected.legalActions?.mainActions ?? []).find(
      (a) => a.targetCellId === cellId && (!selectedCardId || a.cardId === selectedCardId),
    );
    if (!action) {
      if ((projected.sequenceMembership[cellId]?.length ?? 0) > 0) {
        setFeedback(
          "That marker is protected by a completed line — the game refuses to remove it.",
        );
      } else if (projected.boardCells[cellId]?.occupantTeamId) {
        setFeedback("That space is occupied. Pick a highlighted space.");
      } else if (selectedCardId) {
        setFeedback("That card cannot be played on this space.");
      }
      return;
    }
    perform({
      type: action.type,
      playerId: currentPlayerId(state)!,
      actionId: `tutorial-${Date.now()}`,
      cardId: action.cardId,
      targetCellId: action.targetCellId,
    } as GameCommand);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 pb-16 pt-[calc(var(--safe-top)+1.5rem)]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Tutorial{" "}
          <span className="ml-1 text-base font-normal text-secondary">
            {index + 1} / {LESSONS.length}
          </span>
        </h1>
        <Link href="/" className="btn btn-ghost">
          Exit
        </Link>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${((index + (done ? 1 : 0)) / LESSONS.length) * 100}%`,
            background: "var(--color-accent)",
          }}
        />
      </div>

      <label className="mt-4 flex items-center gap-2 text-xs text-secondary">
        Jump to lesson
        <select
          value={index}
          onChange={(event) => restart(Number(event.target.value))}
          className="rounded-[8px] border border-white/10 bg-surface px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-[var(--color-accent)]"
        >
          {LESSONS.map((entry, lessonIndex) => (
            <option key={entry.title} value={lessonIndex}>
              {lessonIndex + 1}. {entry.title}
            </option>
          ))}
        </select>
      </label>

      <section className="panel mt-4 p-4">
        <h2 className="font-semibold">{lesson.title}</h2>
        <p className="mt-1 text-sm text-secondary">{lesson.instruction}</p>
        {feedback && (
          <p
            className={`mt-2 text-sm font-medium ${done ? "text-success" : "text-accent"}`}
            role="status"
          >
            {feedback}
          </p>
        )}
      </section>

      <div className="mt-4">
        <GameBoard
          projected={projected}
          selectedCardId={selectedCardId}
          legalTargets={legalTargets}
          removableTargets={removableTargets}
          showLegalMoves={true}
          animationSpeed={1}
          onCellClick={onCellClick}
        />
      </div>

      <div className="hand-dock mt-3 justify-center">
        {(projected.hand ?? []).map((card) => (
          <PlayingCard
            key={card.id}
            code={card.code}
            selected={selectedCardId === card.id}
            playable
            onClick={() =>
              setSelectedCardId(selectedCardId === card.id ? null : card.id)
            }
          />
        ))}
        {(projected.legalActions?.deadExchanges ?? []).map((exchange) => (
          <button
            key={exchange.cardId}
            type="button"
            className="btn btn-secondary self-center"
            onClick={() =>
              perform({
                type: "EXCHANGE_DEAD_CARD",
                playerId: currentPlayerId(state)!,
                actionId: `tutorial-${Date.now()}`,
                cardId: exchange.cardId,
              })
            }
          >
            Exchange dead card
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-between">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={index === 0}
          onClick={() => restart(index - 1)}
        >
          ← Previous
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => restart()}>
          Restart lesson
        </button>
        {done || index === LESSONS.length - 1 ? (
          index < LESSONS.length - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => restart(index + 1)}
            >
              Next lesson →
            </button>
          ) : (
            <Link href="/play/local" className="btn btn-primary">
              Play now →
            </Link>
          )
        ) : (
          <button type="button" className="btn btn-primary" disabled>
            Next lesson →
          </button>
        )}
      </div>
    </main>
  );
}
