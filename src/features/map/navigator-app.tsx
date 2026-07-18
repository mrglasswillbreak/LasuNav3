"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { CampusMap } from "./campus-map";
import { NavigationSheet } from "@/features/sheet/navigation-sheet";
import { useMapPack } from "@/features/offline-pack/use-map-pack";
import { getOfflineData } from "@/features/offline-pack/pack-manager";
import type { POI, RoutingGraph } from "@/features/offline-pack/types";
import { searchPois } from "@/features/search/search";
import { distanceFromRoute, findRoute, type Route } from "@/features/navigation/router";
import { makeInstructions } from "@/features/navigation/instructions";
import { useGeolocation } from "@/features/navigation/use-geolocation";
import { publicAsset } from "@/lib/public-asset";

export function NavigatorApp() {
  const { resolvedTheme } = useTheme(); const pack = useMapPack(); const location = useGeolocation();
  const [pois, setPois] = useState<POI[]>([]); const [graph, setGraph] = useState<RoutingGraph>(); const [query, setQuery] = useState(""); const [startPoi, setStartPoi] = useState<POI>(); const [destination, setDestination] = useState<POI>(); const [route, setRoute] = useState<Route>();
  const offRouteSince = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (pack.status === "ready") {
      void getOfflineData().then((data) => { setPois(data.pois ?? []); setGraph(data.graph); });
      return;
    }
    // Preview the published campus data on first visit. Offline navigation still
    // requires an explicit IndexedDB pack download.
    void Promise.all([
      fetch(publicAsset("packs/lasu-ojo-graph.json")).then((response) => response.ok ? response.json() : undefined),
      fetch(publicAsset("packs/lasu-ojo-pois.json")).then((response) => response.ok ? response.json() : []),
    ]).then(([previewGraph, previewPois]) => { setGraph(previewGraph); setPois(previewPois); }).catch(() => undefined);
  }, [pack.status]);
  useEffect(() => { if (!graph || !destination || route) return; const start = location.position ?? startPoi?.position ?? graph.nodes[0]?.position; if (start) setRoute(findRoute(graph, start, destination.position)); }, [graph, destination, startPoi, location.position, route]);
  useEffect(() => {
    if (!graph || !destination || !route || !location.position) return;
    if (distanceFromRoute(location.position, route) > 25) { offRouteSince.current ??= Date.now(); if (Date.now() - offRouteSince.current >= 10_000) { setRoute(findRoute(graph, location.position, destination.position)); offRouteSince.current = undefined; } }
    else offRouteSince.current = undefined;
  }, [graph, destination, route, location.position]);
  const results = useMemo(() => searchPois(pois, query), [pois, query]); const instructions = useMemo(() => route ? makeInstructions(route) : [], [route]);
  const chooseDestination = (poi: POI) => { setRoute(undefined); setDestination(poi); setQuery(""); };
  return <main className="relative h-dvh overflow-hidden bg-[#e9f1ed] dark:bg-[#12201a]">
    <CampusMap pois={pois} graph={graph} route={route} position={location.position} heading={location.heading} dark={resolvedTheme === "dark"} follow={location.following} hasPmtiles={pack.status === "ready" && !!pack.manifest?.files.some((file) => file.id === "pmtiles")} />
    <header className="absolute left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex items-center justify-between"><div className="rounded-2xl bg-white/92 px-3 py-2 shadow-lg backdrop-blur dark:bg-[#17251f]/92"><h1 className="text-sm font-bold tracking-tight">LASU Navigator</h1><p className="text-[11px] text-slate-500 dark:text-slate-300">Ojo Campus · Offline-first</p></div>{location.accuracy && location.accuracy > 30 && <p className="rounded-xl bg-amber-100 px-3 py-2 text-xs text-amber-950 shadow dark:bg-amber-300">Low GPS accuracy ({Math.round(location.accuracy)}m)</p>}</header>
    <NavigationSheet query={query} onQuery={setQuery} results={results} onPick={chooseDestination} onSetStart={(poi) => { setRoute(undefined); setStartPoi(poi); setQuery(""); }} destination={destination} instructions={instructions} status={pack.status} progress={pack.progress} error={pack.error} updateAvailable={pack.updateAvailable} onDownload={pack.download} following={location.following} onLocate={location.start} onStop={() => { setDestination(undefined); setRoute(undefined); }} />
    {pack.updateAvailable && pack.status === "ready" && <p className="absolute left-1/2 top-24 z-20 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs text-white shadow-lg">New campus map ready to download</p>}
    {location.error && <p className="absolute bottom-72 left-4 right-4 z-10 rounded-xl bg-white/95 p-3 text-xs text-slate-700 shadow dark:bg-[#17251f] dark:text-slate-100">{location.error}</p>}
  </main>;
}
