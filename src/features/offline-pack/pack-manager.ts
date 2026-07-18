import { clearPack, getDb, activeVersion, setActiveVersion } from "./db";
import { createSHA256 } from "hash-wasm";
import type { MapPackManifest, PackFile, POI, RoutingGraph, StoredPack, VersionDocument } from "./types";
import { publicAsset } from "@/lib/public-asset";

const CHUNK_SIZE = 1024 * 1024;

export async function getVersionDocument(signal?: AbortSignal): Promise<VersionDocument> {
  const response = await fetch(publicAsset("version.json"), { cache: "no-store", signal });
  if (!response.ok) throw new Error("Could not check for campus-map updates.");
  const version = await response.json() as VersionDocument;
  return {
    ...version,
    latestPack: {
      ...version.latestPack,
      files: version.latestPack.files.map((file) => ({ ...file, url: publicAsset(file.url) })),
    },
  };
}

export async function getActivePack(): Promise<StoredPack | undefined> {
  const version = await activeVersion(); return version ? (await getDb()).get("packs", version) : undefined;
}

async function downloadFile(version: string, file: PackFile, onProgress: (received: number) => void) {
  const response = await fetch(file.url);
  if (!response.ok || !response.body) throw new Error(`Could not download ${file.id}.`);
  const db = await getDb(); const reader = response.body.getReader(); const hasher = await createSHA256(); hasher.init();
  let received = 0; let index = 0; let pending = new Uint8Array(0);
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    received += value.byteLength; hasher.update(value); onProgress(received);
    const combined = new Uint8Array(pending.byteLength + value.byteLength); combined.set(pending); combined.set(value, pending.byteLength);
    let offset = 0;
    while (combined.byteLength - offset >= CHUNK_SIZE) {
      const chunk = combined.slice(offset, offset + CHUNK_SIZE); await db.put("chunks", chunk.buffer, [version, file.id, index++]); offset += CHUNK_SIZE;
    }
    pending = combined.slice(offset);
  }
  if (pending.byteLength) await db.put("chunks", pending.buffer, [version, file.id, index]);
  if (file.sha256 && file.sha256 !== "development" && hasher.digest("hex") !== file.sha256) throw new Error(`${file.id} failed integrity verification.`);
}

export async function installPack(manifest: MapPackManifest, onProgress: (received: number, total: number) => void) {
  const total = manifest.files.reduce((sum, file) => sum + file.bytes, 0);
  const estimate = await navigator.storage?.estimate?.();
  if (estimate && estimate.quota && estimate.quota - (estimate.usage ?? 0) < total * 1.2) throw new Error("INSUFFICIENT_STORAGE");
  const db = await getDb(); await clearPack(manifest.version);
  await db.put("packs", { packId: manifest.packId, version: manifest.version, manifest, state: "downloading", createdAt: Date.now() });
  let completed = 0;
  try {
    for (const file of manifest.files) { await downloadFile(manifest.version, file, (received) => onProgress(completed + received, total)); completed += file.bytes; }
    await db.put("packs", { packId: manifest.packId, version: manifest.version, manifest, state: "ready", createdAt: Date.now() });
    const previous = await activeVersion(); await setActiveVersion(manifest.version);
    if (previous && previous !== manifest.version) await clearPack(previous);
  } catch (error) { await clearPack(manifest.version); throw error; }
}

async function bytesFor(version: string, fileId: PackFile["id"], offset = 0, length?: number) {
  const db = await getDb(); const chunks: ArrayBuffer[] = []; let i = 0;
  while (true) { const chunk = await db.get("chunks", [version, fileId, i++]); if (!chunk) break; chunks.push(chunk); }
  const all = new Uint8Array(chunks.reduce((n, item) => n + item.byteLength, 0)); let at = 0; for (const chunk of chunks) { all.set(new Uint8Array(chunk), at); at += chunk.byteLength; }
  return all.slice(offset, length === undefined ? undefined : offset + length).buffer;
}

export async function readPackJson<T>(fileId: "graph" | "pois"): Promise<T | undefined> {
  const pack = await getActivePack(); if (!pack) return undefined;
  const text = new TextDecoder().decode(await bytesFor(pack.version, fileId)); return JSON.parse(text) as T;
}
export async function readPmtilesRange(offset: number, length: number) {
  const pack = await getActivePack(); if (!pack) throw new Error("No offline map is installed.");
  return bytesFor(pack.version, "pmtiles", offset, length);
}
export async function getOfflineData() { return { graph: await readPackJson<RoutingGraph>("graph"), pois: await readPackJson<POI[]>("pois") }; }
