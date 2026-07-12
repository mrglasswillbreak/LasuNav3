import { DBSchema, IDBPDatabase, openDB } from "idb";
import type { StoredPack } from "./types";

interface LasuDb extends DBSchema {
  packs: { key: string; value: StoredPack; indexes: { "by-state": string } };
  chunks: { key: [string, string, number]; value: ArrayBuffer };
  settings: { key: string; value: string };
}

const DB_NAME = "lasu-navigator";
let dbPromise: Promise<IDBPDatabase<LasuDb>> | undefined;

export function getDb() {
  dbPromise ??= openDB<LasuDb>(DB_NAME, 1, {
    upgrade(db) {
      const packs = db.createObjectStore("packs", { keyPath: "version" });
      packs.createIndex("by-state", "state");
      db.createObjectStore("chunks");
      db.createObjectStore("settings");
    },
  });
  return dbPromise;
}

export async function activeVersion() { return (await getDb()).get("settings", "active-pack"); }
export async function setActiveVersion(version: string) { return (await getDb()).put("settings", version, "active-pack"); }
export async function clearPack(version: string) {
  const db = await getDb(); const tx = db.transaction(["packs", "chunks"], "readwrite");
  await tx.objectStore("packs").delete(version);
  let cursor = await tx.objectStore("chunks").openCursor();
  while (cursor) { if (cursor.key[0] === version) await cursor.delete(); cursor = await cursor.continue(); }
  await tx.done;
}
