/**
 * GameScreen — responsive game layout (§34–§38).
 *
 * Desktop: players | board | match info with hand dock at the bottom.
 * Tablet landscape: board left, info right.
 * Mobile portrait: header, player strip, board (max width), hand dock.
 * The board stays visually dominant on every breakpoint.
 */

"use client";

import { useMemo, useState } from "react";
import type {
  CellId,
  ProjectedState,
  SequenceSelectionOption,
} from "@quintara/game-engine";
import { GameBoard, SequenceTraceOverlay } from "./GameBoard";
import { PlayerHand } from "./PlayerHand";
import { MatchInfo, PlayersPanel, TurnBanner } from "./Panels";
import {
  PassDeviceScreen,
  SequenceSelectionPanel,
  SettingsPanel,
  VictoryModal,
} from "./Modals";
import type { GameState } from "@quintara/game-engine";
import { useSettings } from "@/lib/settings";

export interface HandoffState {
  pending: boolean;
  playerName: string;
  teamName: string;
  onReady: () => void;
}

export interface GameNotice {
  id: string | number;
  message: string;
  tone: "info" | "error" | "success";
}

export interface GameScreenProps {
  projected: ProjectedState;
  /** Authoritative state for local dead-card derivation; null online. */
  authoritativeState: GameState | null;
  viewerId: string | null;
  lastPlacedCellId: CellId | null;
  lastMoveSummary: string | null;
  botThinking: boolean;
  handoff: HandoffState;
  sequenceSelection: {
    options: readonly SequenceSelectionOption[];
    onSelect: (option: SequenceSelectionOption) => void;
    onUseDefault: () => void;
  } | null;
  connectionLabel?: string | null;
  notices?: readonly GameNotice[];
  onDismissNotice?: (id: string | number) => void;
  /** Online rooms: viewers who are not the host see a waiting state instead. */
  hideRematch?: boolean;
  /** Pass-and-play: show the winning side, not viewer-relative defeat. */
  neutralResult?: boolean;
  /** Online turn countdown, when the room enforces a timer. */
  turnTimer?: { remainingMs: number; totalMs: number } | null;
  /** Online: block board/hand input while the socket is reconnecting. */
  interactionDisabled?: boolean;
  onSelectCard: (cardId: string) => void;
  onCellClick: (cellId: CellId) => void;
  onExchange: (cardId: string) => void;
  onRematch: () => void;
  onQuit: () => void;
  selectedCardId: string | null;
}

export function GameScreen(props: GameScreenProps) {
  const {
    projected,
    authoritativeState,
    viewerId,
    lastPlacedCellId,
    lastMoveSummary,
    botThinking,
    handoff,
    sequenceSelection,
    connectionLabel,
    notices = [],
    hideRematch,
    neutralResult,
    turnTimer,
    interactionDisabled = false,
    selectedCardId,
  } = props;

  const [settingsOpen, setSettingsOpen] = useState(false);
  // User preferences (§62) drive legal-move visuals and animation pacing.
  const showLegalMoves = useSettings((s) => s.showLegalMoves);
  const animationSpeed = useSettings((s) => s.animationSpeed);

  const legalTargets = useMemo(() => {
    const set = new Set<CellId>();
    if (selectedCardId) {
      for (const action of projected.legalActions?.mainActions ?? []) {
        if (
          action.cardId === selectedCardId &&
          action.type !== "PLAY_REMOVE_JACK"
        ) {
          set.add(action.targetCellId);
        }
      }
    }
    return set;
  }, [projected.legalActions, selectedCardId]);

  const removableTargets = useMemo(() => {
    const set = new Set<CellId>();
    if (selectedCardId) {
      for (const action of projected.legalActions?.mainActions ?? []) {
        if (
          action.cardId === selectedCardId &&
          action.type === "PLAY_REMOVE_JACK"
        ) {
          set.add(action.targetCellId);
        }
      }
    }
    return set;
  }, [projected.legalActions, selectedCardId]);

  const currentName =
    projected.players.find((p) => p.isCurrentPlayer)?.name ?? "—";
  const viewerIsActing =
    viewerId !== null &&
    projected.players.find((p) => p.id === viewerId)?.isCurrentPlayer === true;

  const selectedCard = selectedCardId
    ? projected.hand?.find((card) => card.id === selectedCardId)
    : null;
  const suitSymbol =
    selectedCard &&
    ({
      HEARTS: "♥",
      DIAMONDS: "♦",
      CLUBS: "♣",
      SPADES: "♠",
    } as Record<string, string>)[selectedCard.suit];
  const legalTargetCount = legalTargets.size + removableTargets.size;
  const selectionAnnouncement = selectedCard
    ? `${selectedCard.rank}${suitSymbol ?? ` of ${selectedCard.suit.toLowerCase()}`} selected. ${legalTargetCount} legal ${legalTargetCount === 1 ? "space" : "spaces"}.`
    : viewerIsActing
      ? "Select a card from your hand."
      : "";

  // Keyboard users should not have to Shift+Tab back through the page after
  // choosing a card. A keyboard activation jumps focus to the first legal
  // space; pointer activation leaves focus where the user clicked.
  function handleSelectCard(cardId: string, viaKeyboard = false): void {
    const wasSelected = selectedCardId === cardId;
    props.onSelectCard(cardId);
    if (!viaKeyboard || wasSelected || interactionDisabled) return;
    const target =
      projected.legalActions?.mainActions.find(
        (action) =>
          action.cardId === cardId && action.type !== "PLAY_REMOVE_JACK",
      )?.targetCellId ??
      projected.legalActions?.mainActions.find(
        (action) => action.cardId === cardId,
      )?.targetCellId;
    if (!target) return;
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(`[data-cell-id="${target}"]`)
        ?.focus();
    });
  }

  return (
    <div
      className="mx-auto flex min-h-[100dvh] w-full max-w-[1500px] flex-col px-3 pb-2 pt-[calc(var(--safe-top)+0.6rem)] sm:px-5"
      id="__next_root"
    >
      <div
        className="flex flex-1 flex-col"
        inert={handoff.pending || settingsOpen || projected.status === "FINISHED"}
        aria-hidden={
          handoff.pending || settingsOpen || projected.status === "FINISHED"
            ? true
            : undefined
        }
      >
      {/* Top status bar (§35) */}
      <header className="flex flex-wrap items-center gap-2 py-2 sm:gap-3">
        <span
          className="shrink-0 text-base font-bold tracking-[0.16em] sm:text-lg sm:tracking-[0.22em]"
          style={{
            background: "linear-gradient(180deg, #f6d99a, var(--color-accent))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          QUINTARA
        </span>
        <div className="hidden flex-1 sm:block" />
        <div className="order-3 ml-auto min-w-0 sm:order-none">
          <TurnBanner
            projected={projected}
            viewerId={viewerId}
            botThinking={botThinking}
            turnTimer={turnTimer}
          />
        </div>
        <button
          type="button"
          className="btn btn-ghost shrink-0 px-2.5 py-2 text-sm sm:px-3"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        >
          <span aria-hidden>⚙</span>
          <span className="hidden sm:inline">Settings</span>
        </button>
      </header>

      {connectionLabel && (
        <div className="mb-1 text-center text-xs text-secondary" role="status">
          {connectionLabel}
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {selectionAnnouncement}
      </p>

      {/* Main area — responsive columns (§35–§38) */}
      <main className="grid flex-1 items-start gap-4 pb-3 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
        {/* Players: side column on desktop, horizontal strip on mobile */}
        <div className="order-2 lg:order-1">
          <div className="lg:block">
            <PlayersPanel projected={projected} viewerId={viewerId} />
          </div>
        </div>

        {/* Board — dominant */}
        <div className="relative order-1 mx-auto w-full max-w-[min(100%,720px)] lg:order-2 lg:max-w-none">
          {sequenceSelection && viewerIsActing && (
            <div className="mb-3">
              <SequenceSelectionPanel
                options={sequenceSelection.options}
                onSelect={sequenceSelection.onSelect}
                onUseDefault={sequenceSelection.onUseDefault}
                disabled={interactionDisabled}
              />
            </div>
          )}
          <GameBoard
            projected={projected}
            selectedCardId={selectedCardId}
            legalTargets={legalTargets}
            removableTargets={removableTargets}
            showLegalMoves={showLegalMoves}
            animationSpeed={animationSpeed}
            lastPlacedCellId={lastPlacedCellId}
            disabled={interactionDisabled}
            onCellClick={props.onCellClick}
          />
          <SequenceTraceOverlay projected={projected} speed={animationSpeed} />
        </div>

        {/* Match info */}
        <div className="order-3">
          <MatchInfo
            projected={projected}
            turnLabel={currentName}
            lastMoveSummary={lastMoveSummary}
            round={Math.ceil(projected.turnNumber / Math.max(1, projected.players.length))}
          />
        </div>
      </main>

      {/* Hand dock (§52) */}
      <footer className="sticky bottom-0 z-10">
        <div className="panel px-3 py-1.5">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
              Your hand
            </span>
            {viewerIsActing && (
              <span className="text-xs text-accent">
                Select a card, then a highlighted space
              </span>
            )}
          </div>
          <PlayerHand
            projected={projected}
            authoritativeState={authoritativeState}
            selectedCardId={selectedCardId}
            canAct={
              viewerIsActing &&
              projected.status === "ACTIVE" &&
              !interactionDisabled
            }
            deadExchangeAvailable={
              (projected.legalActions?.deadExchanges.length ?? 0) > 0 &&
              !projected.deadCardExchangeUsed
            }
            onSelectCard={handleSelectCard}
            onExchange={props.onExchange}
          />
        </div>
      </footer>
      </div>

      {notices.length > 0 && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--safe-bottom)+5.5rem)] z-40 flex flex-col items-center gap-2 px-4"
          aria-live="polite"
        >
          {notices.map((notice) => (
            <div
              key={notice.id}
              role={notice.tone === "error" ? "alert" : "status"}
              className={`toast pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 ${
                notice.tone === "error"
                  ? "border-[var(--color-danger)]"
                  : notice.tone === "success"
                    ? "border-[var(--color-success)]"
                    : ""
              }`}
            >
              <span>{notice.message}</span>
              {props.onDismissNotice && (
                <button
                  type="button"
                  className="btn btn-ghost shrink-0 px-2 py-1 text-xs"
                  onClick={() => props.onDismissNotice?.(notice.id)}
                  aria-label="Dismiss message"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Overlays */}
      {handoff.pending && projected.status === "ACTIVE" && (
        <PassDeviceScreen
          playerName={handoff.playerName}
          teamName={handoff.teamName}
          onReady={handoff.onReady}
        />
      )}
      {projected.status === "FINISHED" && (
        <VictoryModal
          projected={projected}
          viewerId={viewerId}
          onRematch={props.onRematch}
          onQuit={props.onQuit}
          hideRematch={hideRematch === true}
          neutralResult={neutralResult}
        />
      )}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
