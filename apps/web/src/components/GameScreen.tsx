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

export interface HandoffState {
  pending: boolean;
  playerName: string;
  teamName: string;
  onReady: () => void;
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
    selectedCardId,
  } = props;

  const [settingsOpen, setSettingsOpen] = useState(false);

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

  return (
    <div
      className="mx-auto flex min-h-[100dvh] w-full max-w-[1500px] flex-col px-3 pb-2 pt-[calc(var(--safe-top)+0.6rem)] sm:px-5"
      id="__next_root"
    >
      {/* Top status bar (§35) */}
      <header className="flex items-center gap-3 py-2">
        <span
          className="text-lg font-bold tracking-[0.22em]"
          style={{
            background: "linear-gradient(180deg, #f6d99a, var(--color-accent))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          QUINTARA
        </span>
        <div className="flex-1" />
        <TurnBanner
          projected={projected}
          viewerId={viewerId}
          botThinking={botThinking}
        />
        <button
          type="button"
          className="btn btn-ghost px-3 py-2 text-sm"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        >
          ⚙ Settings
        </button>
      </header>

      {connectionLabel && (
        <div className="mb-1 text-center text-xs text-secondary" role="status">
          {connectionLabel}
        </div>
      )}

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
          {sequenceSelection && (
            <div className="mb-3">
              <SequenceSelectionPanel
                options={sequenceSelection.options}
                onSelect={sequenceSelection.onSelect}
              />
            </div>
          )}
          <GameBoard
            projected={projected}
            selectedCardId={selectedCardId}
            legalTargets={legalTargets}
            removableTargets={removableTargets}
            showLegalMoves={true}
            animationSpeed={1}
            lastPlacedCellId={lastPlacedCellId}
            onCellClick={props.onCellClick}
          />
          <SequenceTraceOverlay projected={projected} speed={1} />
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
            canAct={viewerIsActing && projected.status === "ACTIVE"}
            deadExchangeAvailable={
              (projected.legalActions?.deadExchanges.length ?? 0) > 0 &&
              !projected.deadCardExchangeUsed
            }
            onSelectCard={props.onSelectCard}
            onExchange={props.onExchange}
          />
        </div>
      </footer>

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
        />
      )}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
