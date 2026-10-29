import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Adjust Quintara sound, haptics, legal-move highlights, animation speed and reduced-motion preferences.",
  alternates: { canonical: "/settings" },
};

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
