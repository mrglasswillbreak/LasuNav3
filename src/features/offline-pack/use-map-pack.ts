"use client";
import { useCallback, useEffect, useState } from "react";
import { getActivePack, getVersionDocument, installPack } from "./pack-manager";
import type { MapPackManifest, PackStatus } from "./types";

export function useMapPack() {
  const [status, setStatus] = useState<PackStatus>("uninstalled"); const [manifest, setManifest] = useState<MapPackManifest>();
  const [available, setAvailable] = useState<MapPackManifest>(); const [progress, setProgress] = useState(0); const [error, setError] = useState<string>();
  const check = useCallback(async () => {
    const [active, version] = await Promise.all([getActivePack(), getVersionDocument().catch(() => undefined)]);
    if (active) { setManifest(active.manifest); setStatus("ready"); }
    if (version) { setAvailable(version.latestPack); if (!active) setManifest(version.latestPack); }
  }, []);
  useEffect(() => { void check(); const listener = () => void check(); window.addEventListener("online", listener); return () => window.removeEventListener("online", listener); }, [check]);
  const download = useCallback(async () => {
    const target = available ?? manifest; if (!target) return; setStatus("downloading"); setProgress(0); setError(undefined);
    try { await installPack(target, (received, total) => setProgress(total ? received / total : 0)); setManifest(target); setStatus("ready"); }
    catch (reason) { const message = reason instanceof Error ? reason.message : "Download failed."; setError(message); setStatus(message === "INSUFFICIENT_STORAGE" ? "insufficient-storage" : "error"); }
  }, [available, manifest]);
  const updateAvailable = !!available && available.version !== manifest?.version;
  return { status, manifest, available, progress, error, updateAvailable, download, check };
}
