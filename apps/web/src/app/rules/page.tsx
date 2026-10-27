/**
 * How to Play (§66): interactive rulebook with animated examples instead of
 * walls of text.
 */

import Link from "next/link";
import type { ReactNode } from "react";

const SECTIONS: { title: string; body: ReactNode }[] = [
  {
    title: "Goal",
    body: (
      <p>
        Complete unbroken lines of <strong>five</strong> of your team&apos;s
        markers — horizontally, vertically or diagonally. In a two-side game
        you need <strong>2 lines</strong>; with three sides, the first to{" "}
        <strong>1 line</strong> wins.
      </p>
    ),
  },
  {
    title: "The Board",
    body: (
      <p>
        A 10 × 10 grid shows 96 card spaces — each card identity (no Jacks)
        appears exactly twice — plus four golden <strong>wild corners</strong>.
        Your markers claim spaces; the board itself decides where each card may
        be played.
      </p>
    ),
  },
  {
    title: "Taking a Turn",
    body: (
      <ol className="list-decimal space-y-1 pl-5">
        <li>Optionally exchange one dead card.</li>
        <li>Play one card: place a marker on a matching open space.</li>
        <li>Or play a Jack (see below).</li>
        <li>Draw a replacement card automatically. Turn passes.</li>
      </ol>
    ),
  },
  {
    title: "Normal Cards",
    body: (
      <div className="space-y-2">
        <p>
          A card like <strong>8♥</strong> may be played on either of the two{" "}
          <strong>8♥</strong> board spaces — if they are open. Selecting a card
          highlights its legal spaces; everything else dims.
        </p>
        <ExampleRow codes={["8♥", "8♥"]} note="Both copies open → either works." />
      </div>
    ),
  },
  {
    title: "Wild Corners",
    body: (
      <p>
        The four golden corners count for <strong>every</strong> team. Nobody
        places, removes or blocks them. Four markers plus a corner make a valid
        line — in any direction through the corner.
      </p>
    ),
  },
  {
    title: "Two-Eyed Jacks (J♣ J♦)",
    body: (
      <p>
        Place a marker on <strong>any</strong> empty card space. Save them for
        finishing lines or winning blocking moves — not every empty cell is
        equally valuable.
      </p>
    ),
  },
  {
    title: "One-Eyed Jacks (J♥ J♠)",
    body: (
      <p>
        Remove one opponent marker of your choice. You do not place your own
        marker on that turn. Markers inside completed lines are{" "}
        <strong>protected</strong> and can never be removed.
      </p>
    ),
  },
  {
    title: "Dead Cards",
    body: (
      <p>
        When both copies of a card&apos;s space are occupied, that card is{" "}
        <strong>dead</strong> — it shows a DEAD badge. Once per turn you may
        exchange a dead card for a fresh one and keep playing. Deadness is
        dynamic: freeing a space with a One-Eyed Jack revives the card.
      </p>
    ),
  },
  {
    title: "Completed Lines",
    body: (
      <p>
        Lines are detected automatically — never needed to announce them. A
        completed line is permanent and its markers are protected for the rest
        of the game.
      </p>
    ),
  },
  {
    title: "Overlapping Lines",
    body: (
      <div className="space-y-2">
        <p>
          Two separate lines of the same team may share{" "}
          <strong>at most one</strong> space. A cross of five plus five through
          one centre counts as two lines — often a winning move. A run of nine
          can score twice (1–5 and 5–9), but a run of six scores only once.
        </p>
        <ExampleRow codes={["●", "●", "●", "●", "●"]} note="Five in a row = one line." />
      </div>
    ),
  },
  {
    title: "Team Play",
    body: (
      <p>
        Teammates share markers and lines but never see each other&apos;s
        hands. Turn order alternates between teams, so no two teammates play
        back-to-back.
      </p>
    ),
  },
  {
    title: "Winning",
    body: (
      <p>
        The moment your team reaches the required number of lines, the game
        ends — no last-turn replies. If nobody can make progress for a full
        round, the game ends in a rare stalemate draw.
      </p>
    ),
  },
];

export default function RulesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-16 pt-[calc(var(--safe-top)+2rem)]">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">How to Play</h1>
        <Link href="/" className="btn btn-ghost">
          ← Home
        </Link>
      </div>
      <p className="mt-2 text-secondary">
        Quintara takes about a minute to learn — this page is the full
        rulebook.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {SECTIONS.map((section, index) => (
          <section key={section.title} className="panel p-5">
            <h2 className="flex items-center gap-2.5 text-lg font-semibold">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}
              >
                {index + 1}
              </span>
              {section.title}
            </h2>
            <div className="mt-2.5 text-sm leading-relaxed text-text-primary/90">
              {section.body}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Link href="/tutorial" className="btn btn-primary">
          Try the Tutorial
        </Link>
        <Link href="/play/local" className="btn btn-secondary">
          Start a Game
        </Link>
      </div>
    </main>
  );
}

function ExampleRow({
  codes,
  note,
}: {
  codes: string[];
  note: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex gap-1.5">
        {codes.map((code, index) => (
          <span
            key={index}
            className="playing-card flex h-11 w-8 items-center justify-center text-xs font-bold"
          >
            {code}
          </span>
        ))}
      </div>
      <span className="text-xs text-secondary">{note}</span>
    </div>
  );
}
