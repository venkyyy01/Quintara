import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of service for playing Quintara.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 pb-16 pt-[calc(var(--safe-top)+2rem)]">
      <Link href="/" className="btn btn-ghost mb-5 px-2">
        ← Home
      </Link>
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-1.5 text-sm text-secondary">Last updated: 28 October 2026</p>

      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-secondary">
        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Using Quintara
          </h2>
          <p className="mt-1.5">
            Quintara is a browser strategy game. You may play for personal
            entertainment and share invite links with friends. Do not attempt to
            disrupt the service, bypass rate limits, attack other players, or
            use automated tools to gain an unfair advantage in online rooms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Online conduct
          </h2>
          <p className="mt-1.5">
            Display names must not impersonate other people or contain abusive,
            hateful or unlawful content. We may remove names, close rooms or
            restrict access to protect players and the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Availability and changes
          </h2>
          <p className="mt-1.5">
            Online rooms are provided as-is and may be interrupted by
            maintenance, reconnects or server restarts. Local modes depend on
            your browser and device. Features and rules may change as the game
            is updated; material changes will be reflected on this page.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            No warranty
          </h2>
          <p className="mt-1.5">
            To the maximum extent permitted by law, the service is provided
            without warranties of any kind, and we are not liable for indirect
            or consequential losses arising from use of the game. Nothing in
            these terms limits rights you have under applicable consumer law.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Contact
          </h2>
          <p className="mt-1.5">
            Questions about these terms can be sent to{" "}
            <a className="text-accent underline-offset-4 hover:underline" href="mailto:support@quintara.game">
              support@quintara.game
            </a>
            . Replace this address with your real support address before a paid
            launch.
          </p>
        </section>
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/privacy" className="btn btn-secondary">
          Privacy Policy
        </Link>
        <Link href="/" className="btn btn-ghost">
          Back home
        </Link>
      </div>
    </main>
  );
}
