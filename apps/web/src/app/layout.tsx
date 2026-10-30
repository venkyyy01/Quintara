import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { AmbientFX } from "@/components/AmbientFX";
import { PwaBootstrap } from "@/components/PwaBootstrap";
import { getSiteUrl } from "@/lib/site";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "QUINTARA — Build the line. Break the plan. Own the board.",
    template: "%s · QUINTARA",
  },
  description:
    "Quintara is a premium browser-based strategy board game: play solo vs AI, local pass-and-play, or online with friends.",
  applicationName: "QUINTARA",
  manifest: "/manifest.webmanifest",
  keywords: [
    "Quintara",
    "strategy board game",
    "browser game",
    "online multiplayer",
    "pass and play",
    "card game",
  ],
  openGraph: {
    type: "website",
    siteName: "QUINTARA",
    title: "QUINTARA — Build the line. Break the plan. Own the board.",
    description:
      "A premium browser strategy game of cards and position. Play solo, pass-and-play, or online with friends.",
    url: "/",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Quintara app icon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QUINTARA — Build the line. Break the plan. Own the board.",
    description:
      "A premium browser strategy game of cards and position. Play solo, pass-and-play, or online with friends.",
    images: ["/icons/icon-512.png"],
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "QUINTARA",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`}>
      <body>
        <AmbientFX />
        <div className="app-shell">
          <PwaBootstrap />
          {children}
        </div>
      </body>
    </html>
  );
}
