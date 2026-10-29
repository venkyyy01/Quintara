import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tutorial",
  description:
    "Learn Quintara step by step on real engine positions: normal cards, wild corners, jacks, dead cards and protected lines.",
  alternates: { canonical: "/tutorial" },
};

export default function TutorialLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
