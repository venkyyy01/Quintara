import type { MetadataRoute } from "next";
import { BASE_PATH, getSiteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = `${getSiteUrl()}${BASE_PATH}`;
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
    "/licenses",
  ];
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route.startsWith("/play") ? 0.8 : 0.5,
  }));
}
