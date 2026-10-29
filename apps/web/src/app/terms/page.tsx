import Link from "next/link";
import type { Metadata } from "next";
import { getContactEmail, ISSUES_URL, SECURITY_ADVISORY_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of service for playing Quintara.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const contactEmail = getContactEmail();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 pb-16 pt-[calc(var(--safe-top)+2rem)]">
      <Link href="/" className="btn btn-ghost mb-5 px-2">
        ← Home
      </Link>
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-1.5 text-sm text-secondary">
        Last updated: 28 October 2026
      </p>

      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-secondary">
        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Acceptance
          </h2>
          <p className="mt-1.5">
            By accessing or playing Quintara, you agree to these terms and to
            our{" "}
            <Link
              className="text-accent underline-offset-4 hover:underline"
              href="/privacy"
            >
              Privacy Policy
            </Link>
            . If you do not agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Who we are
          </h2>
          <p className="mt-1.5">
            Quintara is operated by Venkata Sai Krishna Chirasani, an individual
            based in Canada. In these terms, “we”, “us”, “our”, and “operator”
            refer to that person. The governing-law section below explains which
            law applies.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Eligibility
          </h2>
          <p className="mt-1.5">
            You must be at least 13 years old to use Quintara, including all
            solo, pass-and-play, tutorial, and online modes. If you are 13–17,
            you must have a parent or guardian review and agree to these terms
            on your behalf. We do not knowingly allow children under 13 to use
            the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Your limited license to play
          </h2>
          <p className="mt-1.5">
            We grant you a personal, non-exclusive, non-transferable, revocable,
            limited license to access and play Quintara for entertainment. You
            may share invite links with friends and share screenshots or streams
            of your gameplay, provided you do not imply that we sponsor or
            endorse you and you do not sell access to the game. You may not use
            the game to operate a competing service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Ownership
          </h2>
          <p className="mt-1.5">
            To the extent copyright and other rights subsist and are owned by
            the operator or its licensors, Quintara and its source code, game
            engine, AI, user interface, artwork, icons, rules text,
            documentation, logos, and other original material are proprietary
            and are protected by copyright, trademark, and other laws. These
            terms do not transfer any ownership to you. All rights not expressly
            granted are reserved. See the repository’s{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://github.com/vskrch/Quintara/blob/main/LICENSE"
            >
              LICENSE
            </a>{" "}
            for the source-code terms.
          </p>
          <p className="mt-1.5">
            Some of the game was produced with substantial AI assistance. The
            operator claims rights only in material that is protected by law and
            owned by the operator. Purely AI-generated output may not be
            protected by copyright, and the operator does not represent that
            every portion of the game is exclusively human-authored. See the{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://github.com/vskrch/Quintara/blob/main/docs/ai-assistance-disclosure.md"
            >
              AI assistance disclosure
            </a>
            .
          </p>
          <p className="mt-1.5">
            If you send us feedback or suggestions, you grant us a perpetual,
            worldwide, royalty-free, irrevocable license to use them without
            obligation, attribution, or compensation.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Display names and user content
          </h2>
          <p className="mt-1.5">
            You are responsible for the display name and any content you submit.
            Display names must not impersonate other people, contain abusive,
            hateful, harassing, or unlawful content, or include personal or
            sensitive information. You grant us a non-exclusive, worldwide,
            royalty-free license to display, reproduce, and moderate your
            display name and content as needed to operate the service. We may
            remove names, close rooms, or restrict access to protect players and
            the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Prohibited conduct
          </h2>
          <ul className="mt-2 list-disc pl-5">
            <li>
              Cheating, using bots or automated tools, or exploiting bugs in
              online rooms.
            </li>
            <li>
              Disrupting the service, bypassing rate limits, or attacking other
              players or infrastructure.
            </li>
            <li>
              Harassing, threatening, doxxing, or discriminating against others.
            </li>
            <li>
              Uploading or sharing unlawful, infringing, or malicious content.
            </li>
            <li>
              Impersonating another person, the operator, or an affiliated
              brand.
            </li>
            <li>
              Scraping, reverse engineering, or circumventing access controls,
              except where the law expressly permits it.
            </li>
            <li>
              Using the service in violation of applicable law or third-party
              platform rules.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Availability, changes, and termination
          </h2>
          <p className="mt-1.5">
            Quintara is a beta service. Online rooms are provided as-is and may
            be interrupted by maintenance, reconnects, or server restarts. Local
            modes depend on your browser and device. Features and rules may
            change as the game is updated. We may suspend or terminate access if
            you violate these terms or if we need to protect the service,
            players, or legal compliance. Material changes to these terms will
            be reflected on this page.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Third-party services
          </h2>
          <p className="mt-1.5">
            The game may be delivered through hosting providers, app stores, or
            other third-party services. Those services have their own terms and
            privacy policies. We are not responsible for third-party services we
            do not control.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            No warranty
          </h2>
          <p className="mt-1.5">
            To the maximum extent permitted by law, the service is provided “as
            is” and “as available”, without warranties of any kind, express or
            implied, including merchantability, fitness for a particular
            purpose, title, and non-infringement. We do not warrant that the
            service will be uninterrupted, error-free, secure, or free of
            harmful components. Nothing in these terms limits rights you have
            under applicable consumer law.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Limitation of liability
          </h2>
          <p className="mt-1.5">
            To the maximum extent permitted by law, we are not liable for
            indirect, incidental, special, exemplary, consequential, or punitive
            damages, or for loss of profits, data, goodwill, or business
            opportunity, arising from or relating to the service or these terms.
            Our total aggregate liability for all claims relating to the service
            will not exceed the greater of CAD $100 or the amount you paid us in
            the twelve months before the claim. Nothing in these terms limits
            liability for fraud, gross negligence, wilful misconduct, death or
            personal injury, or any liability that cannot be limited by law.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Indemnity
          </h2>
          <p className="mt-1.5">
            To the extent permitted by law, you agree to indemnify and hold the
            operator harmless from claims, losses, and expenses (including
            reasonable legal fees) arising from your misuse of the service, your
            content, or your breach of these terms, except to the extent caused
            by the operator’s negligence or wilful misconduct.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Governing law
          </h2>
          <p className="mt-1.5">
            These terms are governed by the laws of Canada and the applicable
            province or territory in which the operator resides, without regard
            to conflict-of-laws rules. The courts located in that province or
            territory have jurisdiction, except where consumer law gives you the
            right to bring a claim in your local courts. If any provision is
            held unenforceable, it will be limited to the minimum extent
            necessary and the remaining provisions will remain in effect.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Trademarks and non-affiliation
          </h2>
          <p className="mt-1.5">
            QUINTARA and the Quintara logo are used as unregistered common-law
            marks by the operator. No registered trademark is claimed. See the
            repository’s{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://github.com/vskrch/Quintara/blob/main/TRADEMARK.md"
            >
              trademark policy
            </a>{" "}
            for status, including an adverse US Class 9 registration owned by
            Brilliant Systems LLC. All other trademarks are the property of
            their respective owners. Quintara is an independent project and is
            not affiliated with, endorsed by, or sponsored by Jax Ltd., Goliath
            Games, Goliath IP Stichting, or the publishers of the board game{" "}
            <em>Sequence</em>. <em>Sequence</em> is a registered trademark of
            Goliath IP Stichting; Jax Ltd., Inc. was the original registrant.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">Contact</h2>
          <p className="mt-1.5">
            {contactEmail ? (
              <>
                Questions about these terms can be sent to{" "}
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
                A monitored legal contact address has not been configured for
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
        <Link href="/privacy" className="btn btn-secondary">
          Privacy Policy
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
