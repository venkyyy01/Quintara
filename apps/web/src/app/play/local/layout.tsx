import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Play Solo or Pass-and-Play",
  description:
    "Play Quintara against AI or share one device with friends. The full rules engine runs locally and works offline.",
  alternates: { canonical: "/play/local" },
};

export default function LocalPlayLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
