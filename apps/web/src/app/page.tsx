/**
 * Home screen (§57): cinematic landing with a live 3D board tableau,
 * tagline and primary game entries.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { createStandardBoardDefinition } from "@quintara/game-engine";
import { HomeShowcase } from "@/components/HomeShowcase";

export const metadata: Metadata = {
  alternates: { canonical: "./" },
};

const BOARD_CELLS = createStandardBoardDefinition().cells;

export default function HomePage() {
  return (
    <main className="home-page">
      <div className="relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-6xl items-center gap-8 px-5 pb-12 pt-[calc(var(--safe-top)+2.25rem)] sm:px-8 lg:grid-cols-[1.04fr_0.96fr] lg:grid-rows-[auto_auto] lg:gap-x-6 lg:gap-y-8 lg:py-14">
        <section className="hero-copy text-center lg:col-start-1 lg:row-start-1 lg:text-left">
          <span className="hero-eyebrow">
            <span className="dot" aria-hidden />
            Season I · Tactical Card Duel
          </span>

          <h1 className="hero-title mt-5">QUINTARA</h1>

          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-text-secondary sm:text-xl lg:mx-0">
            Build the line. Break the plan.{" "}
            <span className="text-text-primary">Own the board.</span>
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-secondary lg:mx-0">
            A strategy game of cards and position. Claim spaces, forge
            five-in-a-row lines, and defend them from rival Jacks.
          </p>
        </section>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <HomeShowcase cells={BOARD_CELLS} />
        </div>

        <section className="hero-actions w-full lg:col-start-1 lg:row-start-2">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-3 lg:mx-0">
            <Link
              href="/play/local?quick=1"
              className="btn btn-primary group w-full py-4 text-lg"
            >
              <span className="text-xl" aria-hidden>
                ⚡
              </span>
              Quick Play
              <span className="text-sm font-medium opacity-70">
                vs AI · one tap
              </span>
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/play/online"
                className="btn btn-secondary py-3.5 text-sm sm:text-base"
              >
                <span aria-hidden>🌐</span>
                Play with Friends
              </Link>
              <Link
                href="/play/local?mode=solo"
                className="btn btn-secondary py-3.5 text-sm sm:text-base"
              >
                <span aria-hidden>🤖</span>
                Play AI
              </Link>
            </div>
            <Link
              href="/play/local?mode=pass"
              className="btn btn-secondary w-full py-3.5 text-sm sm:text-base"
            >
              <span aria-hidden>🃏</span>
              Local Pass &amp; Play
            </Link>
          </div>

          <div className="mx-auto mt-6 grid w-full max-w-xl grid-cols-2 gap-2.5 sm:grid-cols-4 lg:mx-0">
            <HomeTile
              href="/play/local?mode=solo&challenge=1"
              label="Daily Challenge"
              icon={<DiamondIcon />}
            />
            <HomeTile href="/rules" label="How to Play" icon={<BookIcon />} />
            <HomeTile href="/tutorial" label="Tutorial" icon={<CapIcon />} />
            <HomeTile href="/settings" label="Settings" icon={<GearIcon />} />
          </div>

          <div className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-2 lg:mx-0 lg:justify-start">
            <span className="hero-stat">
              <strong>10 × 10</strong> board
            </span>
            <span className="hero-stat">
              <strong>2–12</strong> players
            </span>
            <span className="hero-stat">
              <strong>4</strong> AI levels
            </span>
            <span className="hero-stat">
              <strong>Offline</strong> ready
            </span>
          </div>
        </section>
      </div>

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-[calc(var(--safe-bottom)+2rem)] sm:px-8">
        <div className="flex flex-col items-center gap-3 border-t border-white/6 pt-5 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-secondary">
            <Link
              href="/stats"
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              Stats &amp; history
            </Link>
            <Link href="/privacy" className="hover:text-accent">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-accent">
              Terms
            </Link>
            <Link href="/licenses" className="hover:text-accent">
              Licenses
            </Link>
            <Link href="/offline" className="hover:text-accent">
              Offline help
            </Link>
          </div>
          <p className="max-w-2xl text-[11px] leading-relaxed text-secondary">
            Quintara is an independent project. It is not affiliated with,
            endorsed by, or sponsored by Jax Ltd., Goliath Games, Goliath IP
            Stichting, or the publishers of the board game <em>Sequence</em>.
          </p>
        </div>
      </footer>
    </main>
  );
}

function HomeTile({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="panel home-tile flex flex-col items-center gap-2 px-3 py-4"
    >
      <span className="tile-icon text-accent" aria-hidden>
        {icon}
      </span>
      <span className="text-xs font-semibold">{label}</span>
    </Link>
  );
}

function DiamondIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden>
      <path
        d="M12 3l9 9-9 9-9-9 9-9z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.5l4.5 4.5-4.5 4.5L7.5 12 12 7.5z"
        fill="currentColor"
        opacity=".35"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden>
      <path
        d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5v-15z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M4 18.5A2.5 2.5 0 016.5 16H20"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 7h8M8 10.5h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden>
      <path
        d="M2.5 9.5L12 5l9.5 4.5L12 14 2.5 9.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M6 11.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5M21.5 9.5V15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M19.4 13.5a7.8 7.8 0 000-3l1.7-1.3-2-3.4-2 .8a7.8 7.8 0 00-2.6-1.5L14.2 3h-4l-.3 2.1a7.8 7.8 0 00-2.6 1.5l-2-.8-2 3.4 1.7 1.3a7.8 7.8 0 000 3l-1.7 1.3 2 3.4 2-.8a7.8 7.8 0 002.6 1.5l.3 2.1h4l.3-2.1a7.8 7.8 0 002.6-1.5l2 .8 2-3.4-1.7-1.3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
