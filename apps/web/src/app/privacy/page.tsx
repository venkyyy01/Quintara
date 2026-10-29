import Link from "next/link";
import type { Metadata } from "next";
import { getContactEmail, ISSUES_URL, SECURITY_ADVISORY_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How Quintara handles game data, local storage and online rooms.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const contactEmail = getContactEmail();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 pb-16 pt-[calc(var(--safe-top)+2rem)]">
      <Link href="/" className="btn btn-ghost mb-5 px-2">
        ← Home
      </Link>
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-1.5 text-sm text-secondary">
        Last updated: 28 October 2026
      </p>

      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-secondary">
        <section>
          <h2 className="text-base font-semibold text-text-primary">
            The short version
          </h2>
          <p className="mt-1.5">
            Quintara has no accounts, no advertising and no third-party
            analytics. Solo, pass-and-play and tutorial games run entirely in
            your browser. Online rooms keep only the data needed to run the
            match. Finished games may be retained as replay records and
            summaries in the server’s in-memory store until the server restarts
            or older records are evicted.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Who is responsible
          </h2>
          <p className="mt-1.5">
            Quintara is operated by Venkata Sai Krishna Chirasani, an individual
            based in Canada. For the purposes of applicable privacy law, that
            person is the data controller (or the equivalent responsible party)
            for the information described below.
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
            generated guest identifier, your chosen display name, room state and
            game commands. Active room state is held in memory and is removed
            when the room closes. Finished games are retained as replay records
            and summaries in the in-memory store, currently bounded to 500 games
            and 200 summaries, until the server restarts or older records are
            evicted. Public-room summaries can appear in the shared history
            feed; private-room summaries are not published there but remain
            accessible by their game ID. We do not sell personal information or
            share it for advertising.
          </p>
          <p className="mt-1.5">
            Like most internet services, the hosting and server infrastructure
            may process standard connection data such as your IP address,
            browser user agent, timestamps, and error or security logs. This is
            used to operate the service, prevent abuse, and troubleshoot
            failures.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Why we process it
          </h2>
          <ul className="mt-2 list-disc pl-5">
            <li>
              To provide the game, online rooms, reconnects and saved state.
            </li>
            <li>To keep the service secure and prevent cheating or abuse.</li>
            <li>To diagnose errors and improve reliability.</li>
            <li>To comply with legal obligations and enforce our terms.</li>
          </ul>
          <p className="mt-1.5">
            Where the GDPR or UK GDPR applies, we rely on legitimate interests
            for operating and securing the service, performance of a contract
            where you use online play, and consent where required. You can
            object to processing based on legitimate interests by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            How long we keep it
          </h2>
          <p className="mt-1.5">
            Local data stays until you clear it. Active room state disappears
            when the room closes. Finished-game replays and summaries are held
            in the server’s in-memory store until the server restarts or the
            bounded store evicts them (currently up to 500 games and 200
            summaries). Hosting and security logs are retained for up to 30
            days, unless a longer period is needed for security, fraud
            prevention, or legal compliance. To request deletion of a
            finished-game record, contact us with the game ID. Records are also
            removed when the server restarts or when the bounded store evicts
            them; we will handle deletion requests in accordance with applicable
            law.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">Sharing</h2>
          <p className="mt-1.5">
            We do not sell personal information. We may share it with hosting,
            infrastructure, and security providers that process it on our
            behalf; with professional advisers; with authorities where required
            by law; or as part of a transfer of the project. Service providers
            are expected to protect the data and use it only for the services
            they provide.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            International transfers
          </h2>
          <p className="mt-1.5">
            Our hosting providers may process data in Canada, the United States,
            or other countries. Before transferring personal information across
            borders where safeguards are required, we will put contractual or
            other lawful safeguards in place. The specific mechanism depends on
            the hosting provider and deployment; contact us for current details.
            Do not submit sensitive personal information through display names
            or online rooms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            EU and UK representatives
          </h2>
          <p className="mt-1.5">
            The current beta is not specifically directed at the EU or UK. If
            the operator begins directing the service to those markets and is
            required to appoint a representative, the representative’s details
            will be published here before those operations begin. Until then,
            contact the operator using the details below.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Your rights
          </h2>
          <p className="mt-1.5">
            Depending on where you live, you may have the right to access,
            correct, delete, restrict, or object to the processing of your
            personal information, to receive a portable copy, or to withdraw
            consent. You can clear local data yourself through your browser or
            the in-app controls. For server-side data, contact us using the
            details below. We may need to verify your request before acting on
            it. You also have the right to complain to your local privacy
            regulator.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Children
          </h2>
          <p className="mt-1.5">
            Quintara is intended for players aged 13 and over in every mode,
            including solo, pass-and-play, tutorial, and online play. Players
            aged 13–17 need a parent or guardian to review and agree to the
            terms. We do not knowingly collect personal information from
            children under 13. If you believe a child under 13 has provided
            personal information, please contact us so we can remove it. Do not
            use a display name that contains personal or sensitive information.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Cookies and analytics
          </h2>
          <p className="mt-1.5">
            Quintara does not set advertising cookies and does not include
            third-party analytics or tracking pixels. Local storage is used for
            functional game state and settings. If we add analytics or other
            tracking in the future, we will update this policy and, where
            required, ask for consent first.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Security
          </h2>
          <p className="mt-1.5">
            We use reasonable technical and organisational measures to protect
            the service, including server-authoritative game state, signed guest
            tokens, rate limits, and per-viewer state projection. No system is
            completely secure, and no method of transmission or storage is
            guaranteed.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">Changes</h2>
          <p className="mt-1.5">
            We may update this policy as the game changes. Material changes will
            be reflected by a new “last updated” date and, where appropriate, an
            in-app notice.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">Contact</h2>
          <p className="mt-1.5">
            {contactEmail ? (
              <>
                Privacy questions and requests can be sent to{" "}
                <a
                  className="text-accent underline-offset-4 hover:underline"
                  href={`mailto:${contactEmail}`}
                >
                  {contactEmail}
                </a>
                .
              </>
            ) : (
              <>
                A monitored privacy contact address has not been configured for
                this deployment. Do not send personal or sensitive information
                through the public issue tracker. For non-sensitive questions,
                use the{" "}
                <a
                  className="text-accent underline-offset-4 hover:underline"
                  href={ISSUES_URL}
                >
                  public issue tracker
                </a>
                . For security vulnerabilities only, use the{" "}
                <a
                  className="text-accent underline-offset-4 hover:underline"
                  href={SECURITY_ADVISORY_URL}
                >
                  private security advisory flow
                </a>
                .
              </>
            )}
          </p>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/terms" className="btn btn-secondary">
          Terms of Service
        </Link>
        <Link href="/licenses" className="btn btn-ghost">
          Licenses
        </Link>
        <Link href="/" className="btn btn-ghost">
          Back home
        </Link>
      </div>
    </main>
  );
}
