"use client";
import { PMTiles, Protocol, type RangeResponse, type Source } from "pmtiles";
import { readPmtilesRange } from "@/features/offline-pack/pack-manager";

/** PMTiles' supported range-reader seam, backed by the active IndexedDB pack. */
class IndexedDbPmtilesSource implements Source {
  getKey() { return "idb://lasu-ojo-active"; }
  async getBytes(offset: number, length: number): Promise<RangeResponse> { return { data: await readPmtilesRange(offset, length) }; }
}

let protocol: Protocol | undefined;
export function registerOfflinePmtilesProtocol() {
  if (protocol) return protocol;
  protocol = new Protocol();
  protocol.add(new PMTiles(new IndexedDbPmtilesSource()));
  return protocol;
}
