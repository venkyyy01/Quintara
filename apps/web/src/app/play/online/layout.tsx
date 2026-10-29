import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Play Online",
  description:
    "Create a private Quintara room, invite friends with a code, or find a quick match. Reconnect-safe online play in the browser.",
  alternates: { canonical: "/play/online" },
};

export default function OnlinePlayLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
