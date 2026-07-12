import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const WEB_MAP_ID = "ffd68667b1464eeb999c0050897a82a0";
const ZOOM = 13;
const EXTENT = 4096;
const OUT = resolve("public", "packs");
const text = new TextEncoder();
const u8 = (...chunks) => { const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0)); let at = 0; for (const c of chunks) { bytes.set(c, at); at += c.length; } return bytes; };
const varint = (value) => { const out = []; let n = Math.floor(value); while (n > 127) { out.push((n & 127) | 128); n = Math.floor(n / 128); } out.push(n); return Uint8Array.from(out); };
const key = (field, wire) => varint((field << 3) | wire);
const fieldVarint = (field, value) => u8(key(field, 0), varint(value));
const fieldBytes = (field, value) => u8(key(field, 2), varint(value.length), value);
const string = (field, value) => fieldBytes(field, text.encode(value));
const zigzag = (n) => (n << 1) ^ (n >> 31);

function mercatorToLngLat([x, y]) { const lng = x / 20037508.34 * 180; const lat = y / 20037508.34 * 180; return [lng, 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2)]; }
function tileFor([lng, lat], z = ZOOM) { const n = 2 ** z; return [Math.floor((lng + 180) / 360 * n), Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n)]; }
function pointInTile([lng, lat], [tx, ty], z = ZOOM) { const n = 2 ** z; const x = Math.round(((lng + 180) / 360 * n - tx) * EXTENT); const y = Math.round(((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n - ty) * EXTENT); return [x, y]; }
function distance(a, b) { const r = Math.PI / 180; const dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r; const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2; return 12742000 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)); }
function geometry(commands) { return fieldBytes(4, u8(...commands.map(varint))); }
function encodeLine(points) { let px = 0, py = 0; const out = [9, zigzag(points[0][0]), zigzag(points[0][1])]; if (points.length > 1) { out.push(((points.length - 1) << 3) | 2); for (const [x, y] of points.slice(1)) { out.push(zigzag(x - px - (px = x) + x - x), zigzag(y - py - (py = y) + y - y)); } } return out; }
function commandLine(points) { let x = 0, y = 0; const out = [9, zigzag(points[0][0]), zigzag(points[0][1])]; x = points[0][0]; y = points[0][1]; if (points.length > 1) { out.push(((points.length - 1) << 3) | 2); for (const point of points.slice(1)) { out.push(zigzag(point[0] - x), zigzag(point[1] - y)); x = point[0]; y = point[1]; } } return out; }
function signedArea(points) { return points.reduce((sum, point, i) => { const next = points[(i + 1) % points.length]; return sum + point[0] * next[1] - next[0] * point[1]; }, 0); }
function commandPolygon(rings) { const out = []; for (let ring of rings) { if (ring.length < 4) continue; ring = ring.slice(0, -1); if (signedArea(ring) < 0) ring.reverse(); out.push(...commandLine(ring), 15); } return out; }
function valueMessage(value) { return string(1, String(value)); }
function feature(type, commands, properties, dictionary) { const tags = []; for (const [name, value] of Object.entries(properties)) { if (value === undefined || value === null || value === "") continue; let keyIndex = dictionary.keys.indexOf(name); if (keyIndex < 0) { keyIndex = dictionary.keys.length; dictionary.keys.push(name); } const token = String(value); let valueIndex = dictionary.values.indexOf(token); if (valueIndex < 0) { valueIndex = dictionary.values.length; dictionary.values.push(token); } tags.push(keyIndex, valueIndex); }
  return u8(tags.length ? fieldBytes(2, u8(...tags.map(varint))) : new Uint8Array(), fieldVarint(3, type), geometry(commands));
}
function vectorTile(features) { const dictionary = { keys: [], values: [] }; const encoded = features.map((item) => feature(item.type, item.commands, item.properties, dictionary)); const layer = u8(string(1, "campus"), ...encoded.map((item) => fieldBytes(2, item)), ...dictionary.keys.map((item) => string(3, item)), ...dictionary.values.map((item) => fieldBytes(4, valueMessage(item))), fieldVarint(5, EXTENT), fieldVarint(15, 2)); return fieldBytes(3, layer); }
function hilbert(x, y, z) { let d = 0; for (let s = 1 << (z - 1); s > 0; s >>= 1) { const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0; d += s * s * ((3 * rx) ^ ry); if (!ry) { if (rx) { x = (1 << z) - 1 - x; y = (1 << z) - 1 - y; } [x, y] = [y, x]; } } return d; }
function tileId(z, x, y) { return ((4 ** z - 1) / 3) + hilbert(x, y, z); }
function directory(tileID, tileLength) { return u8(varint(1), varint(tileID), varint(1), varint(tileLength), varint(0)); }
function u64(view, offset, value) { view.setBigUint64(offset, BigInt(value), true); }
function i32(view, offset, value) { view.setInt32(offset, Math.round(value), true); }
function pmtiles(tile, z, x, y, bounds) {
  const root = directory(tileId(z, x, y), tile.length); const metadata = text.encode(JSON.stringify({ name: "LASU Ojo campus", format: "pbf", vector_layers: [{ id: "campus", fields: { kind: "String", name: "String", category: "String" } }] }));
  const header = new Uint8Array(127); const view = new DataView(header.buffer); header.set(text.encode("PMTiles")); header[7] = 3; u64(view, 8, 127); u64(view, 16, root.length); u64(view, 24, 127 + root.length); u64(view, 32, metadata.length); u64(view, 40, 0); u64(view, 48, 0); u64(view, 56, 127 + root.length + metadata.length); u64(view, 64, tile.length); u64(view, 72, 1); u64(view, 80, 1); u64(view, 88, 1); header[96] = 1; header[97] = 1; header[98] = 1; header[99] = 1; header[100] = z; header[101] = z; i32(view, 102, bounds[0] * 1e7); i32(view, 106, bounds[1] * 1e7); i32(view, 110, bounds[2] * 1e7); i32(view, 114, bounds[3] * 1e7); header[118] = z; i32(view, 119, ((bounds[0] + bounds[2]) / 2) * 1e7); i32(view, 123, ((bounds[1] + bounds[3]) / 2) * 1e7); return u8(header, root, metadata, tile);
}
function getFeatures(webmap) { return webmap.operationalLayers.flatMap((layer) => layer.featureCollection?.layers ?? []).flatMap((layer) => layer.featureSet?.features ?? []); }
function cleanName(attributes) { return [attributes.Build_name, attributes.DESC_, attributes.Name_of_De, attributes.Name_of_Fa].find((value) => typeof value === "string" && value.trim() && value.trim() !== "-")?.trim(); }

async function main() {
  const mapResponse = await fetch(`https://www.arcgis.com/sharing/rest/content/items/${WEB_MAP_ID}/data?f=json`); if (!mapResponse.ok) throw new Error(`ArcGIS map request failed (${mapResponse.status}).`); const webmap = await mapResponse.json();
  const raw = getFeatures(webmap); const arcgis = raw.filter((item) => item.geometry?.rings).map((item) => ({ rings: item.geometry.rings.map((ring) => ring.map(mercatorToLngLat)), attributes: item.attributes ?? {} }));
  if (!arcgis.length) throw new Error("The official ArcGIS web map has no campus polygon features.");
  const points = arcgis.flatMap((item) => item.rings.flat()); const bounds = [Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1])), Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))];
  const center = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2]; let zoom = ZOOM; let [tx, ty] = tileFor(center, zoom); while (!points.every((point) => { const tile = tileFor(point, zoom); return tile[0] === tx && tile[1] === ty; })) { zoom -= 1; [tx, ty] = tileFor(center, zoom); }
  const padding = .0045; const bbox = [bounds[1] - padding, bounds[0] - padding, bounds[3] + padding, bounds[2] + padding];
  const query = `[out:json][timeout:60];way[highway~"^(footway|path|pedestrian|service|residential)$"](${bbox.join(",")});out geom;`;
  const overpass = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "LASU-Navigator-data-build/0.1" }, body: `data=${encodeURIComponent(query)}` }); if (!overpass.ok) throw new Error(`OSM pedestrian-way request failed (${overpass.status}).`); const osm = await overpass.json(); const ways = osm.elements.filter((item) => Array.isArray(item.geometry) && item.geometry.length > 1).map((item) => ({ id: String(item.id), name: item.tags?.name ?? item.tags?.highway ?? "Campus path", points: item.geometry.map((point) => [point.lon, point.lat]) }));
  if (!ways.length) throw new Error("OSM returned no walkable ways for the LASU campus bounds.");
  const tileFeatures = [
    ...arcgis.map((item) => ({ type: 3, commands: commandPolygon(item.rings.map((ring) => ring.map((point) => pointInTile(point, [tx, ty], zoom)))), properties: { kind: "building", name: cleanName(item.attributes) ?? "LASU building", category: item.attributes.Primary_Us ?? "Campus facility" } })),
    ...ways.map((way) => ({ type: 2, commands: commandLine(way.points.map((point) => pointInTile(point, [tx, ty], zoom))), properties: { kind: "path", name: way.name } })),
  ];
  const tile = vectorTile(tileFeatures); const archive = pmtiles(tile, zoom, tx, ty, bounds);
  const nodeByKey = new Map(); const nodes = []; const edges = [];
  const nodeFor = (position) => { const key = `${position[0].toFixed(7)},${position[1].toFixed(7)}`; if (!nodeByKey.has(key)) { const id = `n${nodes.length}`; nodeByKey.set(key, id); nodes.push({ id, position }); } return nodeByKey.get(key); };
  for (const way of ways) for (let i = 1; i < way.points.length; i++) { const from = nodeFor(way.points[i - 1]), to = nodeFor(way.points[i]); edges.push({ from, to, distance: Math.round(distance(way.points[i - 1], way.points[i]) * 10) / 10, name: way.name }); }
  const pois = []; const names = new Set(); for (const feature of arcgis) { const name = cleanName(feature.attributes); if (!name || names.has(name.toLowerCase())) continue; const ring = feature.rings[0]; const position = ring.reduce((sum, point) => [sum[0] + point[0] / ring.length, sum[1] + point[1] / ring.length], [0, 0]); const nearest = nodes.reduce((best, node) => !best || distance(position, node.position) < distance(position, best.position) ? node : best, undefined); if (nearest && distance(position, nearest.position) <= 90) { names.add(name.toLowerCase()); pois.push({ id: `poi-${pois.length + 1}`, name, category: feature.attributes.Primary_Us || feature.attributes.Build_Type || "Campus facility", position, nodeId: nearest.id }); } }
  if (!pois.length) throw new Error("No official campus places could be snapped to OSM walking routes.");
  await mkdir(OUT, { recursive: true }); const files = [{ id: "pmtiles", filename: "lasu-ojo.pmtiles", content: archive, contentType: "application/vnd.pmtiles" }, { id: "graph", filename: "lasu-ojo-graph.json", content: text.encode(JSON.stringify({ nodes, edges })), contentType: "application/json" }, { id: "pois", filename: "lasu-ojo-pois.json", content: text.encode(JSON.stringify(pois)), contentType: "application/json" }];
  const manifestFiles = []; for (const file of files) { await writeFile(resolve(OUT, file.filename), file.content); manifestFiles.push({ id: file.id, url: `/packs/${file.filename}`, bytes: file.content.length, sha256: createHash("sha256").update(file.content).digest("hex"), contentType: file.contentType }); }
  const version = new Date().toISOString().slice(0, 10); await writeFile(resolve("public", "version.json"), JSON.stringify({ appVersion: "0.1.0", latestPack: { packId: "lasu-ojo-campus", version, releasedAt: new Date().toISOString(), bounds, releaseNotes: `Official ArcGIS campus features merged with ${ways.length} OSM walkable ways.`, attribution: ["Campus features © Lagos State University ArcGIS web map", "© OpenStreetMap contributors"], files: manifestFiles } }, null, 2));
  console.log(`Generated ${archive.length.toLocaleString()} byte PMTiles archive, ${pois.length} searchable official places, ${nodes.length} routing nodes, and ${edges.length} walking edges.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
