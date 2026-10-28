import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quintara.game";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    "",
    "/play/local",
    "/play/online",
    "/rules",
    "/tutorial",
    "/stats",
    "/settings",
    "/privacy",
    "/terms",
  ];
  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route.startsWith("/play") ? 0.8 : 0.5,
  }));
}
