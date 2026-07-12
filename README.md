# LASU Navigator

Offline-first walking navigation Progressive Web App for LASU Ojo campus.

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`, use **Download LASU map**, then reload while offline to test the local graph and POI pack.

## Campus data packs

`public/version.json` describes the active downloadable pack. The committed seed pack is intentionally small and exists to exercise offline installation, search, and routing. Before release, run `npm run data:build`, then use the GIS container under `scripts/data-build/` to replace it with a versioned PMTiles archive, route graph, and POI index generated from the public LASU ArcGIS map and OSM pedestrian data.

Pack files are immutable; publish a new `version.json` only after all files are uploaded and their SHA-256 values are recorded.
