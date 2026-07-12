import type { POI } from "@/features/offline-pack/types";

export function searchPois(pois: POI[], query: string) {
  const term = query.trim().toLocaleLowerCase(); if (!term) return pois.slice(0, 8);
  return pois.filter((poi) => [poi.name, poi.category, ...(poi.aliases ?? [])].some((value) => value.toLocaleLowerCase().includes(term))).slice(0, 10);
}
