import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship compiled dist — no transpilation needed.
};

export default nextConfig;
