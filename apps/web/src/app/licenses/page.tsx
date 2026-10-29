import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Licenses",
  description:
    "Third-party notices and license texts for the software and assets used by Quintara.",
  alternates: { canonical: "/licenses" },
};

const licenseTexts = [
  {
    name: "SIL Open Font License 1.1",
    usedBy: "Sora and Inter fonts",
    href: "/licenses/OFL-1.1.txt",
  },
  {
    name: "GNU Lesser General Public License 3.0",
    usedBy: "libvips (LGPL-3.0-or-later), used by sharp (Apache-2.0)",
    href: "/licenses/LGPL-3.0-or-later.txt",
  },
  {
    name: "GNU General Public License 3.0",
    usedBy: "Incorporated by reference into LGPL-3.0",
    href: "/licenses/GPL-3.0.txt",
  },
  {
    name: "Mozilla Public License 2.0",
    usedBy: "lightningcss and its platform binary",
    href: "/licenses/MPL-2.0.txt",
  },
  {
    name: "Creative Commons Attribution 4.0",
    usedBy: "caniuse-lite browser data",
    href: "/licenses/CC-BY-4.0.txt",
  },
  {
    name: "Apache License 2.0",
    usedBy: "Apache-2.0 dependencies, including sharp",
    href: "/licenses/Apache-2.0.txt",
  },
] as const;

export default function LicensesPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 pb-16 pt-[calc(var(--safe-top)+2rem)]">
      <Link href="/" className="btn btn-ghost mb-5 px-2">
        ← Home
      </Link>
      <h1 className="text-3xl font-bold">Licenses and Notices</h1>
      <p className="mt-1.5 text-sm text-secondary">
        Last updated: 28 October 2026
      </p>

      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-secondary">
        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Quintara itself
          </h2>
          <p className="mt-1.5">
            Quintara is proprietary software, not open source. The repository is
            publicly viewable for portfolio and evaluation purposes, but no
            license is granted for reuse, redistribution, or derivative works
            except as stated in the{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://github.com/vskrch/Quintara/blob/main/LICENSE"
            >
              proprietary LICENSE
            </a>
            . The QUINTARA name and logo are used as unregistered common-law
            marks; no registered trademark is claimed. See the{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://github.com/vskrch/Quintara/blob/main/TRADEMARK.md"
            >
              trademark policy
            </a>{" "}
            for status, including an adverse US Class 9 registration owned by
            Brilliant Systems LLC.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Third-party components
          </h2>
          <p className="mt-1.5">
            Quintara uses third-party packages, fonts, and build tools. Those
            components remain under their own licenses. The principal license
            texts below are served directly from this app. The full
            package-by-package notices are in the repository inventory and must
            be included with any built distribution.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {licenseTexts.map((license) => (
              <li
                key={license.href}
                className="flex flex-col gap-0.5 rounded-lg border border-white/10 px-3 py-2"
              >
                <a
                  className="font-medium text-accent underline-offset-4 hover:underline"
                  href={license.href}
                >
                  {license.name}
                </a>
                <span className="text-xs text-secondary">
                  Used by: {license.usedBy}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Full inventory
          </h2>
          <p className="mt-1.5">
            The package-by-package inventory is maintained in the repository at{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://github.com/vskrch/Quintara/blob/main/docs/third-party-licenses.md"
            >
              docs/third-party-licenses.md
            </a>
            . The inventory is a local macOS arm64 snapshot, not an
            authoritative cross-platform list; platform-specific optional
            dependencies vary. The full notices are in{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://github.com/vskrch/Quintara/blob/main/THIRD_PARTY_NOTICES.md"
            >
              THIRD_PARTY_NOTICES.md
            </a>{" "}
            and in the license files shipped with each package. Those notices
            must be included with any built distribution; this page covers only
            the principal license families.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary">
            Non-affiliation
          </h2>
          <p className="mt-1.5">
            Quintara is an independent project. It is not affiliated with,
            endorsed by, or sponsored by Jax Ltd., Goliath Games, Goliath IP
            Stichting, or the publishers of the board game <em>Sequence</em>.{" "}
            <em>Sequence</em> is a registered trademark of Goliath IP Stichting;
            Jax Ltd., Inc. was the original registrant.
          </p>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/privacy" className="btn btn-secondary">
          Privacy Policy
        </Link>
        <Link href="/terms" className="btn btn-ghost">
          Terms of Service
        </Link>
        <Link href="/" className="btn btn-ghost">
          Back home
        </Link>
      </div>
    </main>
  );
}
