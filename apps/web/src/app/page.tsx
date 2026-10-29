/**
 * Home screen (§57): premium landing with animated board fragments,
 * tagline and primary game entries.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden">
      <AmbientBoard />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col items-center px-6 pb-16 pt-[calc(var(--safe-top)+3rem)] text-center">
        <h1
          className="text-6xl font-bold tracking-[0.18em] sm:text-7xl"
          style={{
            background:
              "linear-gradient(180deg, #f8e3b2, var(--color-accent) 65%, #a97f36)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 12px 30px rgba(215, 173, 98, 0.25))",
          }}
        >
          QUINTARA
        </h1>
        <p className="mt-4 text-lg text-text-secondary sm:text-xl">
          Build the line. Break the plan. Own the board.
        </p>

        <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
          <Link
            href="/play/local?quick=1"
            className="btn btn-primary w-full py-4 text-lg"
          >
            ⚡ Quick Play
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/play/online" className="btn btn-secondary py-3.5">
              Play with Friends
            </Link>
            <Link
              href="/play/local?mode=solo"
              className="btn btn-secondary py-3.5"
            >
              Play AI
            </Link>
          </div>
          <Link
            href="/play/local?mode=pass"
            className="btn btn-secondary w-full py-3.5"
          >
            Local Game
          </Link>
        </div>

        <div className="mt-8 grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
          <HomeTile
            href="/play/local?mode=solo&challenge=1"
            label="Daily Challenge"
            icon="◈"
          />
          <HomeTile href="/rules" label="How to Play" icon="📖" />
          <HomeTile href="/tutorial" label="Tutorial" icon="🎓" />
          <HomeTile href="/settings" label="Settings" icon="⚙" />
        </div>

        <p className="mt-12 max-w-md text-sm leading-relaxed text-secondary">
          A strategy game of cards and position: play cards to claim spaces,
          complete five-in-a-row lines, and protect them from rival Jacks.
        </p>
        <Link
          href="/stats"
          className="mt-4 text-sm text-secondary underline-offset-4 hover:text-accent hover:underline"
        >
          Stats &amp; history
        </Link>
        <nav
          className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-secondary"
          aria-label="Legal"
        >
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
        </nav>
        <p className="mt-4 max-w-md text-[11px] leading-relaxed text-secondary">
          Quintara is an independent project. It is not affiliated with,
          endorsed by, or sponsored by Jax Ltd., Goliath Games, Goliath IP
          Stichting, or the publishers of the board game <em>Sequence</em>.
        </p>
      </div>
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
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="panel flex flex-col items-center gap-1.5 px-3 py-4 transition-transform hover:-translate-y-0.5"
    >
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      <span className="text-xs font-semibold">{label}</span>
    </Link>
  );
}

/** Subtle floating board fragments behind the hero (§57, §87). */
function AmbientBoard() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div
        className="absolute left-1/2 top-[-14%] h-[560px] w-[560px] -translate-x-1/2 rounded-full opacity-[0.16]"
        style={{
          background:
            "radial-gradient(circle, rgba(215,173,98,0.55), transparent 65%)",
        }}
      />
      {[
        { top: "12%", left: "8%", rotate: -14, delay: 0 },
        { top: "18%", right: "10%", rotate: 11, delay: 1.2 },
        { bottom: "16%", left: "12%", rotate: 8, delay: 2.1 },
        { bottom: "22%", right: "14%", rotate: -9, delay: 0.6 },
      ].map((position, index) => (
        <div
          key={index}
          className="card-back playing-card absolute"
          style={{
            width: 72,
            aspectRatio: "5 / 7",
            transform: `rotate(${position.rotate}deg)`,
            top: position.top,
            left: position.left,
            right: position.right,
            bottom: position.bottom,
            opacity: 0.5,
            animation: `float ${7 + index}s ease-in-out ${position.delay}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          from { translate: 0 0; }
          to { translate: 0 -18px; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="float"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
