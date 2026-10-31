import type { NextConfig } from "next";

// GitHub Pages project site: https://leon426.github.io/android-canvas/
// The deploy workflow sets NEXT_PUBLIC_BASE_PATH from actions/configure-pages
// (this repo: /android-canvas, no trailing slash). Leave it unset for `next dev`,
// which should stay at /. The value is inlined at build time.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  devIndicators: false,
};

export default nextConfig;
