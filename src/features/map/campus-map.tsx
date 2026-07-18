"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import maplibregl, { Marker, type Map as MapLibreMap } from "maplibre-gl";
import type { POI, RoutingGraph } from "@/features/offline-pack/types";
import type { Position } from "@/lib/geo/geometry";
import type { Route } from "@/features/navigation/router";
import { publicAsset } from "@/lib/public-asset";
import { registerPreviewPmtiles } from "./idb-pmtiles-source";

type Props = { pois: POI[]; graph?: RoutingGraph; route?: Route; position?: Position; heading?: number; dark: boolean; follow: boolean; hasPmtiles: boolean };
const CAMPUS: Position = [3.2008, 6.4655];
let pmtilesProtocolRegistered = false;

export function CampusMap({ pois, graph, route, position, heading, dark, follow, hasPmtiles }: Props) {
  const element = useRef<HTMLDivElement>(null); const map = useRef<MapLibreMap | undefined>(undefined); const userMarker = useRef<Marker | undefined>(undefined);
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    if (!element.current || map.current) return;
    const previewPmtilesUrl = publicAsset("packs/lasu-ojo.pmtiles");
    const protocol = registerPreviewPmtiles(previewPmtilesUrl);
    if (!pmtilesProtocolRegistered) { maplibregl.addProtocol("pmtiles", protocol.tile); pmtilesProtocolRegistered = true; }
    const instance = map.current = new maplibregl.Map({ container: element.current, center: CAMPUS, zoom: 15.5, attributionControl: false, style: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e9f1ed" } }] } });
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right"); instance.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    instance.on("load", () => {
      instance.addSource("paths", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      instance.addLayer({ id: "paths", type: "line", source: "paths", paint: { "line-color": "#9ab6a6", "line-width": 4, "line-opacity": .65 } });
      instance.addSource("campus-preview", { type: "vector", url: `pmtiles://${previewPmtilesUrl}` });
      instance.addLayer({ id: "campus-preview-polygons", type: "fill", source: "campus-preview", "source-layer": "campus", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#c7ddcf", "fill-opacity": .6 } });
      instance.addLayer({ id: "campus-preview-lines", type: "line", source: "campus-preview", "source-layer": "campus", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": "#477a5d", "line-width": 2 } });
      instance.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      instance.addLayer({ id: "route-casing", type: "line", source: "route", paint: { "line-color": "#ffffff", "line-width": 10, "line-opacity": .85 } });
      instance.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#087e4d", "line-width": 6, "line-opacity": 1 } });
      instance.addSource("pois", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      instance.addLayer({ id: "poi-circles", type: "circle", source: "pois", paint: { "circle-radius": 5, "circle-color": "#0b6b46", "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
      instance.addSource("user", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      instance.addLayer({ id: "user-pulse", type: "circle", source: "user", paint: { "circle-radius": 18, "circle-color": "#0b6b46", "circle-opacity": .15 } });
      instance.addLayer({ id: "user", type: "circle", source: "user", paint: { "circle-radius": 8, "circle-color": "#0b6b46", "circle-stroke-color": "#fff", "circle-stroke-width": 3 } });
      const markerElement = document.createElement("div"); markerElement.innerHTML = '<svg width="50" height="50" viewBox="0 0 50 50" aria-label="Your location"><circle class="location-pulse" cx="25" cy="25" r="13" fill="#0b6b46"/><path d="M25 7 34 34 25 30 16 34z" fill="#0b6b46" stroke="white" stroke-width="3" stroke-linejoin="round"/></svg>';
      userMarker.current = new maplibregl.Marker({ element: markerElement, rotationAlignment: "map" }).setLngLat(CAMPUS).addTo(instance);
      setMapReady(true);
    });
    return () => { setMapReady(false); userMarker.current?.remove(); instance.remove(); map.current = undefined; };
  }, []);
  useEffect(() => {
    const instance = map.current; if (!mapReady || !instance || !hasPmtiles || instance.getSource("campus-vector")) return;
    instance.addSource("campus-vector", { type: "vector", url: "pmtiles://idb://lasu-ojo-active" });
    instance.addLayer({ id: "campus-polygons", type: "fill", source: "campus-vector", "source-layer": "campus", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": dark ? "#244b3a" : "#c7ddcf", "fill-opacity": .6 } });
    instance.addLayer({ id: "campus-lines", type: "line", source: "campus-vector", "source-layer": "campus", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": dark ? "#6eaf89" : "#477a5d", "line-width": 2 } });
  }, [hasPmtiles, dark, mapReady]);
  useEffect(() => {
    const instance = map.current; if (!mapReady || !instance) return;
    instance.setPaintProperty("background", "background-color", dark ? "#12201a" : "#e9f1ed");
    instance.setPaintProperty("campus-preview-polygons", "fill-color", dark ? "#244b3a" : "#c7ddcf");
    instance.setPaintProperty("campus-preview-lines", "line-color", dark ? "#6eaf89" : "#477a5d");
    const pathFeatures = pois.map((poi) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: poi.position } }));
    (instance.getSource("pois") as maplibregl.GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: pathFeatures });
  }, [dark, pois, mapReady]);
  useEffect(() => {
    const instance = map.current; if (!mapReady || !instance || !graph) return;
    const nodes = new Map(graph.nodes.map((node) => [node.id, node.position]));
    (instance.getSource("paths") as maplibregl.GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: graph.edges.flatMap((edge) => {
      const from = nodes.get(edge.from), to = nodes.get(edge.to); return from && to ? [{ type: "Feature" as const, properties: { name: edge.name }, geometry: { type: "LineString" as const, coordinates: [from, to] } }] : [];
    }) });
  }, [graph, mapReady]);
  useEffect(() => { const instance = map.current; if (!mapReady || !instance) return; (instance.getSource("route") as maplibregl.GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: route ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.coordinates } }] : [] }); }, [route, mapReady]);
  useEffect(() => { const instance = map.current; if (!mapReady || !instance) return; (instance.getSource("user") as maplibregl.GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: position ? [{ type: "Feature", properties: { heading }, geometry: { type: "Point", coordinates: position } }] : [] }); if (position) { userMarker.current?.setLngLat(position).setRotation(heading ?? 0); if (follow) instance.easeTo({ center: position, duration: 800, essential: true }); } }, [position, heading, follow, mapReady]);
  return <div ref={element} className="absolute inset-0" aria-label="LASU Ojo campus map" />;
}
