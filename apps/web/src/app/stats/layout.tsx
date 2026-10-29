import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stats & History",
  description:
    "Your local Quintara match history, win rate and streaks. Everything stays on this device.",
  alternates: { canonical: "/stats" },
};

export default function StatsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
