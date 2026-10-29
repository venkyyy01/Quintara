import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Quintara handles game data, local storage and online rooms.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 pb-16 pt-[calc(var(--safe-top)+2rem)]">
      <Link href="/" className="btn btn-ghost mb-5 px-2">
        ← Home
      </Link>
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-1.5 text-sm text-secondary">Last updated: 28 October 2026</p>

      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-secondary">
        <section>
          <h2 className="text-base font-semibold text-text-primary">
            The short version
          </h2>
          <p className="mt-1.5">
            Quintara has no accounts, no advertising and no third-party
            analytics. Solo, pass-and-play and tutorial games run entirely in
            your browser. Online rooms keep only the data needed to run the
            match while it is active.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Data stored on your device
          </h2>
          <p className="mt-1.5">
            We use browser local storage for your settings, an optional
            reconnect token, an interrupted local match, and local stats and
            match history. This data stays on your device and can be cleared
            from Settings, the Stats page, or your browser’s site-data controls.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Online play
          </h2>
          <p className="mt-1.5">
            When you join an online room, the server processes a randomly
            generated guest identifier, your chosen display name, room state
            and game commands. Guest identifiers and room state are held in
            memory and expire when rooms close or the server restarts. We do
            not sell or share this data, and we do not use it for advertising.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Cookies and analytics
          </h2>
          <p className="mt-1.5">
            Quintara does not set advertising cookies and does not include
            third-party analytics or tracking pixels. Hosting infrastructure
            may keep standard request logs for security and reliability.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Children
          </h2>
          <p className="mt-1.5">
            The game is suitable for general audiences. We do not knowingly
            collect personal information from children; online play uses only a
            display name and a temporary guest identifier.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Contact
          </h2>
          <p className="mt-1.5">
            Privacy questions can be sent to{" "}
            <a className="text-accent underline-offset-4 hover:underline" href="mailto:privacy@quintara.game">
              privacy@quintara.game
            </a>
            . Replace this address with your real support address before a paid
            launch.
          </p>
        </section>
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/terms" className="btn btn-secondary">
          Terms of Service
        </Link>
        <Link href="/" className="btn btn-ghost">
          Back home
        </Link>
      </div>
    </main>
  );
}
