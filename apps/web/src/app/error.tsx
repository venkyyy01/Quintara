"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the digest in the console for support without leaking details
    // into the UI.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl" aria-hidden>
        ⚠
      </p>
      <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-secondary">
        The table hit an unexpected error. Your local games are saved on this
        device.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-secondary">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn btn-secondary">
          Back home
        </Link>
      </div>
    </main>
  );
}
