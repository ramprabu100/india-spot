import type { NextConfig } from "next";

/**
 * GitHub Pages project sites need a basePath matching the repo name.
 * Set BASE_PATH in CI (e.g. /my-repo). Leave empty for local / custom domain.
 */
const basePath = process.env.BASE_PATH?.replace(/\/$/, "") || "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  // Dev server binds 0.0.0.0; browsers still hit via 127.0.0.1 / localhost.
  // Without this, Next blocks /_next/hmr and client hydration never attaches handlers.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
