/**
 * Settings page — sound, haptics, motion and accessibility (§62–§65).
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SettingsPanel } from "@/components/Modals";

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="mx-auto w-full max-w-lg px-6 pb-16 pt-[calc(var(--safe-top)+2rem)]">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Link href="/" className="btn btn-ghost">
          ← Home
        </Link>
      </div>
      <div className="mt-6">
        {mounted ? (
          <SettingsPanel inline onClose={() => {}} />
        ) : (
          <div className="panel h-64 animate-pulse" />
        )}
      </div>
    </main>
  );
}
