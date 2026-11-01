import type { MetadataRoute } from "next";
import { BASE_PATH, getSiteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [`${BASE_PATH}/play/online?room=`],
    },
    sitemap: `${getSiteUrl()}${BASE_PATH}/sitemap.xml`,
  };
}
