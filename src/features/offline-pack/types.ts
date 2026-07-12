import type { Position } from "@/lib/geo/geometry";

export type PackFile = { id: "pmtiles" | "graph" | "pois"; url: string; bytes: number; sha256: string; contentType: string };
export type MapPackManifest = {
  packId: string; version: string; releasedAt: string; bounds: [number, number, number, number];
  files: PackFile[]; releaseNotes: string; attribution: string[];
};
export type VersionDocument = { appVersion: string; latestPack: MapPackManifest };
export type StoredPack = { packId: string; version: string; manifest: MapPackManifest; state: "downloading" | "ready"; createdAt: number };
export type PackStatus = "uninstalled" | "downloading" | "ready" | "error" | "insufficient-storage";
export type POI = { id: string; name: string; category: string; position: Position; nodeId: string; aliases?: string[] };
export type GraphNode = { id: string; position: Position };
export type GraphEdge = { from: string; to: string; distance: number; name?: string; accessible?: boolean };
export type RoutingGraph = { nodes: GraphNode[]; edges: GraphEdge[] };
