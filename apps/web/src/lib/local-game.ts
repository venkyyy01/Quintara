/**
 * Local game store: pass-and-play (§21 LOCAL) and solo vs AI (§21 SOLO).
 *
 * The engine runs in the browser; all rules are engine-owned — this store
 * only dispatches commands and renders projections (§140).
 */

"use client";

import { create } from "zustand";
import {
  applyCommand,
  createGame,
  currentPlayerId,
  engineErrorMessage,
  EngineError,
  getPlayer,
  projectStateForViewer,
  resolveSequenceSelectionDefault,
  startGame,
  type GameCommand,
  type GameState,
  type ProjectedState,
  type SequenceCandidate,
} from "@quintara/game-engine";
import {
  chooseBotAction,
  createBotContext,
  decisionToCommand,
  type AiDifficulty,
  type BotContext,
} from "@quintara/game-ai";
import { haptic, sounds } from "./sound";

export type LocalMode = "PASS_AND_PLAY" | "SOLO";

export interface LocalSeat {
  readonly id: string;
  readonly name: string;
  readonly isAi: boolean;
}

interface Toast {
  id: number;
  message: string;
  tone: "info" | "error" | "success";
}

interface LocalGameState {
  mode: LocalMode | null;
  seats: LocalSeat[];
  difficulty: AiDifficulty;
  state: GameState | null;
  projected: ProjectedState | null;
  selectedCardId: string | null;
  /** Pass-and-play privacy screen between turns (§21). */
  awaitingHandoff: boolean;
  toasts: Toast[];
  botThinking: boolean;
  lastMoveSummary: string | null;
  /** Most recent marker placement, for the drop animation (§45). */
  lastPlacedCellId: string | null;

  start: (config: {
    mode: LocalMode;
    seats: LocalSeat[];
    difficulty: AiDifficulty;
  }) => void;
  rematch: () => void;
  quit: () => void;

  selectCard: (cardId: string | null) => void;
  playAt: (cellId: string) => void;
  exchangeDeadCard: (cardId: string) => void;
  selectSequences: (sequences: SequenceCandidate[]) => void;
  useDefaultSequenceSelection: () => void;
  acknowledgeHandoff: () => void;
  dismissToast: (id: number) => void;
}

let toastCounter = 0;
let botTimer: ReturnType<typeof setTimeout> | null = null;

function notice(
  message: string,
  tone: Toast["tone"] = "info",
): { id: number; message: string; tone: Toast["tone"] } {
  return { id: ++toastCounter, message, tone };
}

export const useLocalGame = create<LocalGameState>((set, get) => {
  /** Re-derives the projection for the correct viewer after every change. */
  function refresh(next: GameState): void {
    const { mode, seats } = get();
    const activeId = currentPlayerId(next);
    let viewerId: string | null = null;

    if (mode === "SOLO") {
      viewerId = seats.find((s) => !s.isAi)?.id ?? null;
    } else {
      viewerId = activeId;
    }

    const projected = projectStateForViewer(next, viewerId);

    // Drop a card selection that is no longer playable for the viewer:
    // selections must never leak across handoffs or into finished games.
    const selected = get().selectedCardId;
    const selectionStillPlayable =
      next.status === "ACTIVE" &&
      selected !== null &&
      (projected.legalActions?.mainActions ?? []).some(
        (action) => action.cardId === selected,
      );

    set({
      state: next,
      projected,
      ...(selected !== null && !selectionStillPlayable
        ? { selectedCardId: null }
        : {}),
      ...(next.status !== "ACTIVE" ? { awaitingHandoff: false } : {}),
    });

    maybeScheduleBot(next);
  }

  function maybeScheduleBot(state: GameState): void {
    const { seats, mode } = get();
    if (mode !== "SOLO" || state.status !== "ACTIVE") return;
    const activeId = currentPlayerId(state);
    const seat = seats.find((s) => s.id === activeId);
    if (!seat?.isAi) return;
    if (state.turnPhase === "AWAITING_SEQUENCE_SELECTION") {
      // Same player resolves their own selection — act immediately.
    }

    set({ botThinking: true });
    if (botTimer) clearTimeout(botTimer);
    botTimer = setTimeout(() => {
      const current = get().state;
      if (!current || current.status !== "ACTIVE") {
        set({ botThinking: false });
        return;
      }
      const active = currentPlayerId(current);
      if (!active) {
        set({ botThinking: false });
        return;
      }
      const activeSeat = get().seats.find((s) => s.id === active);
      if (!activeSeat?.isAi) {
        set({ botThinking: false });
        return;
      }
      const context =
        botContexts[activeSeat.id] ??
        (botContexts[activeSeat.id] = createBotContext(get().difficulty));
      try {
        const decision = chooseBotAction(current, active, context);
        const command = decisionToCommand(
          decision,
          active,
          `bot-${Date.now()}`,
          current.version,
        );
        dispatch(command);
      } catch {
        set({ botThinking: false });
      }
    }, 550);
  }

  const botContexts: Record<string, BotContext> = {};

  function dispatch(command: GameCommand): void {
    const current = get().state;
    if (!current) return;
    try {
      const result = applyCommand(current, command);
      set({
        botThinking: false,
        ...("targetCellId" in command
          ? { lastPlacedCellId: command.targetCellId }
          : {}),
      });
      const previousActive = currentPlayerId(current);
      refresh(result.state);
      afterEvents(result.state, command, previousActive);
    } catch (error) {
      set({ botThinking: false });
      if (error instanceof EngineError) {
        set({
          toasts: [
            ...get().toasts.slice(-3),
            notice(engineErrorMessage(error.code), "error"),
          ],
        });
        sounds.error();
        haptic("warning");
      }
    }
  }

  function afterEvents(
    state: GameState,
    command: GameCommand,
    previousActive: string | null,
  ): void {
    const summaries: string[] = [];
    if (command.type === "PLAY_NORMAL_CARD") {
      const card = state.cards[command.cardId];
      const cell = command.targetCellId.replace("r", "R").replace("c", "C");
      summaries.push(`${card?.code ?? "Card"} → ${cell}`);
      sounds.place();
      haptic("light");
    } else if (command.type === "PLAY_WILD_JACK") {
      const cell = command.targetCellId.replace("r", "R").replace("c", "C");
      summaries.push(`Two-Eyed Jack → ${cell}`);
      sounds.place();
      haptic("light");
    } else if (command.type === "PLAY_REMOVE_JACK") {
      const cell = command.targetCellId.replace("r", "R").replace("c", "C");
      summaries.push(`One-Eyed Jack removed a marker at ${cell}`);
      sounds.remove();
      haptic("light");
    } else if (command.type === "EXCHANGE_DEAD_CARD") {
      summaries.push("Dead card exchanged");
      sounds.draw();
    } else if (command.type === "SELECT_SEQUENCE_SET") {
      summaries.push("Line completed!");
    }

    if (summaries.length > 0) {
      set({
        lastMoveSummary: summaries.join(" · "),
      });
    }

    if (state.status === "FINISHED") {
      if (state.winnerTeamId) {
        sounds.victory();
        haptic("medium");
      }
      return;
    }

    const nextActive = currentPlayerId(state);
    const mode = get().mode;
    // §21 handoff privacy: the screen only re-arms when the seat changed.
    // Same-player sub-steps (dead-card exchange, ambiguous line selection)
    // must not interrupt the acting player mid-turn.
    if (
      mode === "PASS_AND_PLAY" &&
      nextActive !== null &&
      nextActive !== previousActive
    ) {
      set({ awaitingHandoff: true });
    }
  }

  return {
    mode: null,
    seats: [],
    difficulty: "MEDIUM",
    state: null,
    projected: null,
    selectedCardId: null,
    awaitingHandoff: false,
    toasts: [],
    botThinking: false,
    lastMoveSummary: null,
    lastPlacedCellId: null,

    start: ({ mode, seats, difficulty }) => {
      if (botTimer) clearTimeout(botTimer);
      for (const key of Object.keys(botContexts)) delete botContexts[key];

      const created = createGame({
        gameId: `local-${Date.now()}`,
        players: seats.map((seat) => ({ id: seat.id, name: seat.name })),
        seed:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `seed-${Date.now()}`,
      });
      const started = startGame(created).state;

      set({
        mode,
        seats,
        difficulty,
        state: started,
        selectedCardId: null,
        awaitingHandoff: mode === "PASS_AND_PLAY",
        toasts: [notice("Game started — good luck!", "success")],
        lastMoveSummary: null,
        lastPlacedCellId: null,
      });
      refresh(started);
    },

    rematch: () => {
      const { mode, seats, difficulty } = get();
      if (!mode) return;
      get().start({ mode, seats, difficulty });
    },

    quit: () => {
      if (botTimer) clearTimeout(botTimer);
      set({
        mode: null,
        state: null,
        projected: null,
        seats: [],
        selectedCardId: null,
        awaitingHandoff: false,
        botThinking: false,
        lastPlacedCellId: null,
      });
    },

    selectCard: (cardId) => {
      set({ selectedCardId: get().selectedCardId === cardId ? null : cardId });
      sounds.select();
    },

    playAt: (cellId) => {
      const { state, selectedCardId, projected, seats, mode } = get();
      if (!state || !selectedCardId || !projected) return;
      const legal = projected.legalActions;
      if (!legal) return;

      const match = [
        ...legal.mainActions,
      ].find(
        (a) => a.cardId === selectedCardId && a.targetCellId === cellId,
      );
      if (!match) {
        sounds.error();
        return;
      }

      const viewerId =
        mode === "SOLO"
          ? (seats.find((s) => !s.isAi)?.id ?? null)
          : currentPlayerId(state);
      if (!viewerId) return;

      const command: GameCommand = {
        type: match.type,
        playerId: viewerId,
        actionId: `local-${Date.now()}`,
        expectedVersion: state.version,
        cardId: match.cardId,
        targetCellId: match.targetCellId,
      };
      set({ selectedCardId: null });
      dispatch(command);
    },

    exchangeDeadCard: (cardId) => {
      const { state, projected, seats, mode } = get();
      if (!state || !projected?.legalActions) return;
      const viewerId =
        mode === "SOLO"
          ? (seats.find((s) => !s.isAi)?.id ?? null)
          : currentPlayerId(state);
      if (!viewerId) return;
      const exchange = projected.legalActions.deadExchanges.find(
        (e) => e.cardId === cardId,
      );
      if (!exchange) {
        set({
          toasts: [...get().toasts.slice(-3), notice("That card is not dead.", "error")],
        });
        return;
      }
      dispatch({
        type: "EXCHANGE_DEAD_CARD",
        playerId: viewerId,
        actionId: `local-${Date.now()}`,
        expectedVersion: state.version,
        cardId,
      });
    },

    selectSequences: (sequences) => {
      const { state, seats, mode } = get();
      if (!state) return;
      const viewerId =
        mode === "SOLO"
          ? (seats.find((s) => !s.isAi)?.id ?? null)
          : currentPlayerId(state);
      if (!viewerId) return;
      sounds.sequence();
      dispatch({
        type: "SELECT_SEQUENCE_SET",
        playerId: viewerId,
        actionId: `local-${Date.now()}`,
        expectedVersion: state.version,
        sequenceCellSets: sequences.map((s) => [...s.cells]),
      });
    },

    useDefaultSequenceSelection: () => {
      const { state } = get();
      if (!state) return;
      const sequences = resolveSequenceSelectionDefault(state);
      get().selectSequences([...sequences]);
    },

    acknowledgeHandoff: () => {
      set({ awaitingHandoff: false });
      sounds.turn();
    },

    dismissToast: (id) => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    },
  };
});

/** Player display name lookup for turn banners. */
export function seatName(state: GameState, playerId: string): string {
  try {
    return getPlayer(state, playerId).name;
  } catch {
    return playerId;
  }
}
