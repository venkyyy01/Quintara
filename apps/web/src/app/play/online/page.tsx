/**
 * Online multiplayer (§21): quick match, private rooms with invite codes,
 * reconnect-safe gameplay driven entirely by server projections.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CellId, SequenceSelectionOption } from "@quintara/game-engine";
import { GameScreen } from "@/components/GameScreen";
import { ReconnectOverlay } from "@/components/Modals";
import {
  useOnlineGame,
  type OnlineGameState,
} from "@/lib/online-game";

export default function OnlinePage() {
  const online = useOnlineGame();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [playerCount, setPlayerCount] = useState(2);
  const [aiSeats, setAiSeats] = useState(0);
  const [difficulty, setDifficulty] = useState("MEDIUM");

  useEffect(() => {
    online.connect();
    // Invite deep links (§30): /play/online?room=CODE joins automatically
    // once the socket is authenticated.
    const invitedCode = new URLSearchParams(window.location.search)
      .get("room")
      ?.trim()
      .toUpperCase();
    if (invitedCode) {
      pendingInvite.current = invitedCode;
      // Clean the URL so a refresh doesn't try to join twice.
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingInvite = useRef<string | null>(null);

  // Hooks must run on every render — computed before the phase-based returns.
  const projected = online.projected;

  // Fire the pending invite join as soon as we're connected and idle.
  const joinRoom = online.joinRoom;
  const connection = online.connection;
  const phase = online.phase;
  const room = online.room;
  useEffect(() => {
    if (
      pendingInvite.current &&
      connection === "connected" &&
      phase === "HOME" &&
      !room
    ) {
      const code = pendingInvite.current;
      pendingInvite.current = null;
      joinRoom(code);
    }
  }, [connection, phase, room, joinRoom]);
  const legalTargets = useMemo(() => {
    const set = new Set<CellId>();
    if (!projected) return set;
    for (const action of projected.legalActions?.mainActions ?? []) {
      if (
        online.selectedCardId
          ? action.cardId === online.selectedCardId &&
            action.type !== "PLAY_REMOVE_JACK"
          : action.type !== "PLAY_REMOVE_JACK"
      ) {
        set.add(action.targetCellId);
      }
    }
    return set;
  }, [projected, online.selectedCardId]);

  const removableTargets = useMemo(() => {
    const set = new Set<CellId>();
    if (!projected) return set;
    if (online.selectedCardId) {
      for (const action of projected.legalActions?.mainActions ?? []) {
        if (
          action.cardId === online.selectedCardId &&
          action.type === "PLAY_REMOVE_JACK"
        ) {
          set.add(action.targetCellId);
        }
      }
    }
    return set;
  }, [projected, online.selectedCardId]);

  // Playing phase — server-driven game screen.
  if (online.phase === "PLAYING" && online.projected) {
    const state = online.projected;
    const me = online.identity?.playerId ?? null;

    return (
      <>
        {online.connection === "reconnecting" && (
          <ReconnectOverlay message="Connection lost — Reconnecting…" />
        )}
        <GameScreen
          projected={state}
          authoritativeState={null}
          viewerId={me}
          selectedCardId={online.selectedCardId}
          lastPlacedCellId={online.lastPlacedCellId}
          lastMoveSummary={online.lastMoveSummary}
          botThinking={false}
          handoff={{ pending: false, playerName: "", teamName: "", onReady: () => {} }}
          sequenceSelection={
            state.turnPhase === "AWAITING_SEQUENCE_SELECTION"
              ? {
                  options: state.pendingSequenceOptions ?? [],
                  onSelect: (option: SequenceSelectionOption) =>
                    online.selectSequences([...option.sequences]),
                  onUseDefault: () => {
                    const first = state.pendingSequenceOptions?.[0];
                    if (first) online.selectSequences([...first.sequences]);
                  },
                }
              : null
          }
          connectionLabel={
            online.connection === "connected"
              ? null
              : "Reconnecting to the game…"
          }
          onSelectCard={(cardId) => online.selectCard(cardId)}
          onCellClick={(cellId: CellId) => {
            const legal = state.legalActions;
            if (!legal) return;
            const match = legal.mainActions.find(
              (a) =>
                a.targetCellId === cellId &&
                (online.selectedCardId
                  ? a.cardId === online.selectedCardId
                  : true),
            );
            if (!match || (!legalTargets.has(cellId) && !removableTargets.has(cellId)))
              return;
            online.sendCommand({
              type: match.type,
              actionId: `web-${Date.now()}`,
              expectedVersion: state.version,
              cardId: match.cardId,
              targetCellId: match.targetCellId,
            });
          }}
          onExchange={(cardId) => {
            online.sendCommand({
              type: "EXCHANGE_DEAD_CARD",
              actionId: `web-${Date.now()}`,
              expectedVersion: state.version,
              cardId,
            });
          }}
          onRematch={() => online.rematch()}
          hideRematch={true}
          onQuit={() => {
            online.leaveRoom();
            router.push("/");
          }}
        />
      </>
    );
  }

  // Lobby / waiting room.
  return (
    <main className="mx-auto w-full max-w-2xl px-6 pb-16 pt-[calc(var(--safe-top)+2rem)]">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Play Online</h1>
        <Link href="/" className="btn btn-ghost">
          ← Home
        </Link>
      </div>

      {online.errorMessage && (
        <div
          className="toast mt-4 flex items-center justify-between border-[var(--color-danger)]"
          role="alert"
        >
          <span>{online.errorMessage}</span>
          <button
            type="button"
            className="btn btn-ghost px-2 py-1 text-xs"
            onClick={online.clearError}
          >
            Dismiss
          </button>
        </div>
      )}

      <div
        className={`mt-3 text-sm ${online.connection === "connected" ? "text-success" : "text-accent"}`}
        role="status"
      >
        {online.connection === "connected"
          ? "● Connected"
          : online.connection === "reconnecting"
            ? "○ Reconnecting…"
            : "○ Connecting…"}
      </div>

      {!online.room && (
        <>
          <section className="panel mt-6 p-5">
            <h2 className="font-semibold">Quick Match</h2>
            <p className="mt-1 text-sm text-secondary">
              Find a compatible opponent automatically (§58).
            </p>
            <button
              type="button"
              className="btn btn-primary mt-4 w-full"
              disabled={online.matchmaking}
              onClick={online.quickMatch}
            >
              {online.matchmaking
                ? "Finding opponent…"
                : "Find Opponent"}
            </button>
            {online.matchmaking && (
              <button
                type="button"
                className="btn btn-ghost mt-2 w-full"
                onClick={online.cancelQuickMatch}
              >
                Cancel
              </button>
            )}
          </section>

          <section className="panel mt-4 p-5">
            <h2 className="font-semibold">Private Room</h2>
            <p className="mt-1 text-sm text-secondary">
              Host a game and share the invite code.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <label className="text-sm">
                Players
                <select
                  className="mt-1 w-full rounded-[10px] border border-white/10 bg-surface px-3 py-2.5 text-sm"
                  value={playerCount}
                  onChange={(e) => setPlayerCount(Number(e.target.value))}
                >
                  {[2, 3, 4, 6].map((count) => (
                    <option key={count} value={count}>
                      {count} players
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                AI seats
                <select
                  className="mt-1 w-full rounded-[10px] border border-white/10 bg-surface px-3 py-2.5 text-sm"
                  value={aiSeats}
                  onChange={(e) => setAiSeats(Number(e.target.value))}
                >
                  {[0, 1, 2, 3].map((count) => (
                    <option key={count} value={count}>
                      {count} bots
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-2.5 block text-sm">
              Bot difficulty
              <select
                className="mt-1 w-full rounded-[10px] border border-white/10 bg-surface px-3 py-2.5 text-sm"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                {["EASY", "MEDIUM", "HARD", "EXPERT"].map((level) => (
                  <option key={level} value={level}>
                    {level[0]}
                    {level.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-primary mt-4 w-full"
              onClick={() =>
                online.createRoom({ playerCount, aiSeats, aiDifficulty: difficulty })
              }
            >
              Create Room
            </button>
          </section>

          <section className="panel mt-4 p-5">
            <h2 className="font-semibold">Join a Room</h2>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={6}
                className="flex-1 rounded-[10px] border border-white/10 bg-surface px-3.5 py-2.5 text-center text-lg font-semibold tracking-[0.3em] outline-none focus:border-[var(--color-accent)]"
                aria-label="Room code"
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => online.joinRoom(joinCode)}
              >
                Join
              </button>
            </div>
          </section>
        </>
      )}

      {online.room && (
        <section className="panel mt-6 p-6">
          <h2 className="flex items-center justify-between text-lg font-semibold">
            Room{" "}
            <span className="rounded-lg bg-accent-soft px-3 py-1 font-mono text-xl tracking-[0.25em] text-accent">
              {online.room.roomCode}
            </span>
          </h2>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={async () => {
                await navigator.clipboard?.writeText(
                  `${window.location.origin}/play/online?room=${online.room?.roomCode ?? ""}`,
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
            >
              {copied ? "✓ Copied" : "Copy Invite"}
            </button>
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={online.leaveRoom}
            >
              Leave
            </button>
          </div>

          <ul className="mt-5 flex flex-col gap-2">
            {online.room.players.map((player) => (
              <li
                key={player.playerId}
                className="flex items-center justify-between rounded-[10px] bg-white/5 px-3.5 py-2.5 text-sm"
              >
                <span className="font-medium">
                  {player.displayName}
                  {player.isAi && (
                    <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[0.62rem] uppercase">
                      Bot
                    </span>
                  )}
                </span>
                <span className="text-xs text-secondary">
                  {player.isHost ? "Host" : player.connection}
                </span>
              </li>
            ))}
            {Array.from({
              length: Math.max(
                0,
                online.room.options.playerCount - online.room.players.length,
              ),
            }).map((_, index) => (
              <li
                key={`open-${index}`}
                className="rounded-[10px] border border-dashed border-white/12 px-3.5 py-2.5 text-sm text-secondary"
              >
                Waiting for player…
              </li>
            ))}
          </ul>

          <StartGameControl online={online} />
          <p className="mt-2 text-center text-xs text-secondary">
            {online.room.players.length} of {online.room.options.playerCount}{" "}
            players ready
          </p>
        </section>
      )}
    </main>
  );
}

function StartGameControl({ online }: { online: OnlineGameState }) {
  const isHost =
    online.identity !== null &&
    online.room?.players.some(
      (player) => player.isHost && player.playerId === online.identity?.playerId,
    ) === true;
  const full =
    online.room !== null &&
    online.room.players.length >= online.room.options.playerCount;

  if (!isHost) {
    return (
      <div
        className="mt-6 w-full rounded-[10px] border border-white/10 bg-white/5 py-3.5 text-center text-sm text-secondary"
        role="status"
      >
        Waiting for the host to start the game…
      </div>
    );
  }
  return (
    <>
      <button
        type="button"
        className="btn btn-primary mt-6 w-full py-3.5"
        disabled={!full}
        onClick={online.startGame}
      >
        {full ? "Start Game" : "Waiting for players…"}
      </button>
      {!full && (
        <p className="mt-1.5 text-center text-xs text-secondary">
          The room must be full (or filled with bots) before starting.
        </p>
      )}
    </>
  );
}
