#!/usr/bin/env bash
# Refresh geo-sources/ from sdc-monorepo geographies.
# Run this when census boundary files change in sdc-monorepo.

set -euo pipefail

SDC="${SDC_MONOREPO:-/Users/ads7fg/git/sdc-monorepo}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/geo-sources"

if [ ! -d "$SDC/geographies" ]; then
  echo "Error: sdc-monorepo not found at $SDC" >&2
  echo "Set SDC_MONOREPO env var to the correct path." >&2
  exit 1
fi

mkdir -p "$DEST"

declare -A SOURCES=(
  [county.geojson]="$SDC/geographies/NCR/Census Geographies/County/2020/data/distribution/ncr_geo_census_cb_2020_counties.geojson"
  [tract.geojson]="$SDC/geographies/NCR/Census Geographies/Tract/2020/data/distribution/ncr_geo_census_cb_2020_census_tracts.geojson"
  [block_group.geojson]="$SDC/geographies/NCR/Census Geographies/Block Group/2020/data/distribution/ncr_geo_census_cb_2020_census_block_groups.geojson"
  [civic_association.geojson]="$SDC/geographies/VA/Local Geographies/Arlington County/Civic Associations/2021/data/distribution/va013_geo_arl_2021_civic_associations.geojson"
  [planning_district.geojson]="$SDC/geographies/VA/Local Geographies/Fairfax County/Planning Districts/2022/data/distribution/va059_geo_ffxct_gis_2022_planning_districts.geojson"
  [supervisor_district.geojson]="$SDC/geographies/VA/Local Geographies/Fairfax County/Supervisor Districts/2022/data/distribution/va059_geo_ffxct_gis_2022_supervisor_districts.geojson"
  [human_services_region.geojson]="$SDC/geographies/VA/Local Geographies/Fairfax County/Human Services Regions/2022/data/distribution/va059_geo_ffxct_gis_2022_human_services_regions.geojson"
  [zip_code.geojson]="$SDC/geographies/VA/Local Geographies/Fairfax County/Zip Codes/2022/data/distribution/va059_geo_ffxct_gis_2022_zip_codes.geojson"
)

for dest_name in "${!SOURCES[@]}"; do
  src="${SOURCES[$dest_name]}"
  if [ ! -f "$src" ]; then
    echo "WARNING: $src not found, skipping $dest_name" >&2
    continue
  fi
  cp "$src" "$DEST/$dest_name"
  echo "Copied $dest_name"
done

echo "Done. Review changes with: git diff geo-sources/"
