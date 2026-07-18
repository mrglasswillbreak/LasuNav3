import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
// GitHub Pages serves project sites from `/<repository>/`. Other static hosts
// remain root-hosted unless NEXT_PUBLIC_BASE_PATH is explicitly provided.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}` : "");

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
  basePath,
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // Pack assets are explicitly streamed into IndexedDB; version.json must remain network-checkable.
  exclude: [/version\.json$/, /packs\//],
});

export default withSerwist(nextConfig);
