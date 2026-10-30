/**
 * GameScreen — responsive game layout (§34–§38).
 *
 * Desktop: players | board | match info with hand dock at the bottom.
 * Tablet landscape: board left, info right.
 * Mobile portrait: header, board, compact player strip, hand dock.
 * The board stays visually dominant on every breakpoint.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  CellId,
  ProjectedState,
  SequenceSelectionOption,
} from "@quintara/game-engine";
import { GameBoard } from "./GameBoard";
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
import { setMusicScene } from "@/lib/sound";

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

  // The adaptive score follows the table: focused while playing, brighter at
  // the finish, and back to the warm lobby bed once the table is left.
  useEffect(() => {
    setMusicScene(projected.status === "FINISHED" ? "climax" : "game");
    return () => setMusicScene("menu");
  }, [projected.status]);

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
    (
      {
        HEARTS: "♥",
        DIAMONDS: "♦",
        CLUBS: "♣",
        SPADES: "♠",
      } as Record<string, string>
    )[selectedCard.suit];
  const legalTargetCount = legalTargets.size + removableTargets.size;
  const selectionAnnouncement = selectedCard
    ? `${selectedCard.rank}${suitSymbol ?? ` of ${selectedCard.suit.toLowerCase()}`} selected. ${legalTargetCount} legal ${legalTargetCount === 1 ? "space" : "spaces"}.`
    : viewerIsActing
      ? "Select a card from your hand."
      : "";

  const round = Math.ceil(
    projected.turnNumber / Math.max(1, projected.players.length),
  );
  const handCount = projected.hand?.length ?? 0;

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
      className="game-shell mx-auto flex min-h-[100dvh] w-full max-w-[1500px] flex-col px-3 pb-2 pt-[calc(var(--safe-top)+0.5rem)] sm:px-5"
      id="__next_root"
    >
      <div
        className="game-frame flex flex-1 flex-col"
        inert={
          handoff.pending || settingsOpen || projected.status === "FINISHED"
        }
        aria-hidden={
          handoff.pending || settingsOpen || projected.status === "FINISHED"
            ? true
            : undefined
        }
      >
        {/* Top status bar (§35) */}
        <header className="game-topbar">
          <Link href="/" className="brand-lockup" aria-label="Quintara home">
            <span className="brand-mark" aria-hidden>
              <BrandGlyph />
            </span>
            <span className="brand-word">QUINTARA</span>
          </Link>

          <div className="hidden flex-1 items-center gap-2 md:flex">
            <span className="status-chip">Round {round}</span>
            <span className="status-chip">Turn {projected.turnNumber}</span>
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            <TurnBanner
              projected={projected}
              viewerId={viewerId}
              botThinking={botThinking}
              turnTimer={turnTimer}
            />
            <button
              type="button"
              className="btn btn-secondary btn-icon shrink-0"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
            >
              <GearGlyph />
            </button>
          </div>
        </header>

        {connectionLabel && (
          <div
            className="mb-1 flex justify-center text-xs text-secondary"
            role="status"
          >
            <span className="connection-pill is-offline">
              <span className="status-dot" aria-hidden />
              {connectionLabel}
            </span>
          </div>
        )}

        <p className="sr-only" role="status" aria-live="polite">
          {selectionAnnouncement}
        </p>

        {/* Main area — responsive columns (§35–§38) */}
        <main className="game-main grid flex-1 grid-cols-[minmax(0,1fr)] items-start gap-4 pb-3 lg:grid-cols-[250px_minmax(0,1fr)_270px] xl:gap-5">
          {/* Players: side column on desktop, horizontal strip on mobile */}
          <div className="game-players order-2 lg:order-1">
            <PlayersPanel projected={projected} viewerId={viewerId} />
          </div>

          {/* Board — dominant */}
          <div
            className={`board-column relative order-1 mx-auto lg:order-2 ${
              viewerIsActing ? "is-active-turn" : ""
            }`}
          >
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
          </div>

          {/* Match info */}
          <div className="game-info order-3 hidden lg:block">
            <MatchInfo
              projected={projected}
              turnLabel={currentName}
              lastMoveSummary={lastMoveSummary}
              round={round}
            />
          </div>
        </main>

        {/* Hand dock (§52) */}
        <footer className="hand-rail sticky bottom-0 z-20">
          <div className="panel hand-panel px-3 py-2">
            <div className="mb-1 flex items-center justify-between gap-2 px-1">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
                <span className="text-accent" aria-hidden>
                  ▰
                </span>
                Your hand
                <span className="rounded-full border border-white/8 bg-white/5 px-1.5 py-0.5 text-[0.62rem] font-bold tracking-normal text-text-primary">
                  {handCount}
                </span>
              </span>
              {viewerIsActing && (
                <span className="hand-hint hidden text-xs text-accent sm:inline">
                  Select a card, then a highlighted space
                </span>
              )}
              {viewerIsActing && (
                <span className="hand-hint text-xs text-accent sm:hidden">
                  Pick a card
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
          <div className="hand-legal flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 px-2 pt-1 text-center text-[10px] leading-tight text-secondary">
            <span>
              Independent project; not affiliated with the publishers of
              Sequence.
            </span>
            <Link
              href="/licenses"
              className="underline-offset-2 hover:text-accent hover:underline"
            >
              Licenses
            </Link>
          </div>
        </footer>
      </div>

      {notices.length > 0 && (
        <div
          className="notice-stack pointer-events-none fixed inset-x-0 bottom-[calc(var(--safe-bottom)+12.5rem)] z-40 flex flex-col items-center gap-2 px-4"
          aria-live="polite"
        >
          {notices.map((notice) => (
            <NoticeToast
              key={notice.id}
              notice={notice}
              onDismiss={props.onDismissNotice}
            />
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

function NoticeToast({
  notice,
  onDismiss,
}: {
  notice: GameNotice;
  onDismiss?: (id: string | number) => void;
}) {
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  // Informational toasts are transient; errors stay until dismissed.
  useEffect(() => {
    if (notice.tone === "error" || !dismissRef.current) return;
    const timer = window.setTimeout(
      () => dismissRef.current?.(notice.id),
      5200,
    );
    return () => window.clearTimeout(timer);
  }, [notice.id, notice.tone]);

  return (
    <div
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
      {onDismiss && (
        <button
          type="button"
          className="btn btn-ghost shrink-0 px-2 py-1 text-xs"
          onClick={() => onDismiss(notice.id)}
          aria-label="Dismiss message"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function BrandGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M12 3l7 5-2.7 8.4H7.7L5 8l7-5z"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.55"
      />
      <circle cx="12" cy="6" r="1.6" fill="currentColor" />
      <circle cx="18" cy="10" r="1.6" fill="currentColor" />
      <circle cx="16" cy="17" r="1.6" fill="currentColor" />
      <circle cx="8" cy="17" r="1.6" fill="currentColor" />
      <circle cx="6" cy="10" r="1.6" fill="currentColor" />
      <path
        d="M12 6l6 4-2 7H8l-2-7 6-4z"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.5"
      />
    </svg>
  );
}

function GearGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.4 13.5a7.8 7.8 0 000-3l1.7-1.3-2-3.4-2 .8a7.8 7.8 0 00-2.6-1.5L14.2 3h-4l-.3 2.1a7.8 7.8 0 00-2.6 1.5l-2-.8-2 3.4 1.7 1.3a7.8 7.8 0 000 3l-1.7 1.3 2 3.4 2-.8a7.8 7.8 0 002.6 1.5l.3 2.1h4l.3-2.1a7.8 7.8 0 002.6-1.5l2 .8 2-3.4-1.7-1.3z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
