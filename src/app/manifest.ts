import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LASU Navigator",
    short_name: "LASU Nav",
    description: "Offline walking navigation for Lagos State University, Ojo campus.",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: "#eef2f1",
    theme_color: "#0b6b46",
    orientation: "portrait-primary",
    categories: ["travel", "navigation", "education"],
    icons: [
      { src: "./icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "./icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Find a place", url: "./?action=search", icons: [{ src: "./icons/icon.svg", sizes: "any" }] }],
  };
}
