FROM ghcr.io/osgeo/gdal:ubuntu-small-latest
RUN apt-get update && apt-get install -y curl osmium-tool tippecanoe && rm -rf /var/lib/apt/lists/*
WORKDIR /work
COPY . .
# The production build invokes: fetch ArcGIS FeatureServer GeoJSON, clips the
# Geofabrik Nigeria extract to campus bounds + 500m, then tippecanoe emits PMTiles.
CMD ["bash", "scripts/data-build/build-pack.sh"]
