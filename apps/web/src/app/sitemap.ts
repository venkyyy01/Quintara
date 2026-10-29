import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
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
