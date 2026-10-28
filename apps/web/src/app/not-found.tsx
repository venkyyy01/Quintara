import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-bold tracking-[0.2em] text-accent" aria-hidden>
        404
      </p>
      <h1 className="mt-3 text-2xl font-bold">This space is empty</h1>
      <p className="mt-2 max-w-sm text-secondary">
        The page you followed doesn’t exist. The board is still waiting.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link href="/" className="btn btn-primary">
          Back home
        </Link>
        <Link href="/play/local?quick=1" className="btn btn-secondary">
          Quick Play
        </Link>
      </div>
    </main>
  );
}
