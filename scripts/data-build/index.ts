/**
 * Data-pack build entry point. It verifies the public LASU ArcGIS source and
 * writes a machine-readable source manifest consumed by the containerized GIS
 * build (GDAL + osmium + tippecanoe). No browser runtime depends on this step.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const APP_ID = "09b40eee207447d39060a4eaf0df8e59";
const base = `https://www.arcgis.com/sharing/rest/content/items/${APP_ID}`;
const request = async (url: string) => { const response = await fetch(url); if (!response.ok) throw new Error(`ArcGIS request failed: ${response.status} ${url}`); return response.json(); };

async function main() {
  const [item, configuration] = await Promise.all([request(`${base}?f=json`), request(`${base}/data?f=json`)]);
  if (item.error || configuration.error) throw new Error("The LASU ArcGIS app is no longer publicly readable; refusing to build an unverified pack.");
  await mkdir(resolve(".data-build"), { recursive: true });
  await writeFile(resolve(".data-build", "arcgis-app.json"), JSON.stringify({ appId: APP_ID, title: item.title, item, configuration, retrievedAt: new Date().toISOString() }, null, 2));
  console.log("ArcGIS source verified. Run the GIS container with .data-build/arcgis-app.json to export public layers, clip OSM pedestrian ways, generate graph/POIs, and create public/packs/lasu-ojo.pmtiles.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
