import type { NextConfig } from "next";

/**
 * GitHub Pages serves project sites from `/<repo>/`, so the static export
 * uses a configurable base path. Server deployments leave both variables
 * unset and keep the original root-relative behaviour.
 */
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
const basePath =
  rawBasePath && rawBasePath !== "/"
    ? `/${rawBasePath.replace(/^\/+|\/+$/g, "")}`
    : "";
const staticExport = process.env.NEXT_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship compiled dist — no transpilation needed.
  ...(basePath ? { basePath } : {}),
  ...(staticExport ? { output: "export", trailingSlash: true } : {}),
};

export default nextConfig;
