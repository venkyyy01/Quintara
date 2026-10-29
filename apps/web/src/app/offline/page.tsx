import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  description: "Quintara is offline. Solo, pass-and-play and tutorial still work.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl" aria-hidden>
        ◈
      </p>
      <h1 className="mt-4 text-3xl font-bold">You’re offline</h1>
      <p className="mt-2 max-w-sm text-secondary">
        Online rooms need a connection. Solo, pass-and-play and the tutorial
        keep working from the cached app.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link href="/play/local?quick=1" className="btn btn-primary">
          Play offline
        </Link>
        <Link href="/tutorial" className="btn btn-secondary">
          Tutorial
        </Link>
        <Link href="/" className="btn btn-ghost">
          Home
        </Link>
      </div>
    </main>
  );
}
