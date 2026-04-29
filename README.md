# National Capital Region Data Commons

An interactive Next.js dashboard for exploring demographic, economic, health, housing, and infrastructure indicators across the National Capital Region (Washington, DC and surrounding counties in Virginia and Maryland).

The dashboard renders choropleth maps, time-series plots, and ranked tables across multiple geographic levels (county, tract, block group, civic association, zip code, planning district, supervisor district, and human services region) with shareable URL state and an integrated AI assistant.

## Live site

Deployed to GitHub Pages at `/national_capital_region_data/`.

## Architecture

```
social-data-commons (Python pipelines)
   produces wide-format CSV.xz files
   committed under dashboard_data/national_capital_region_data/
                      
copied to data/*.csv.xz in this repo
                      
scripts/build-data.ts (npm run build:data)
   decompresses + transforms to JSON lookups
   writes public/data/*.json + datapackage.json
   copies GeoJSON to public/geo/*.geojson
                      
Next.js static export (npm run build)
   reads public/data + public/geo
   outputs ./out/  GitHub Pages
```

Built data (`public/data/`, `public/geo/`) is gitignored and regenerated in CI.

## Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript strict mode
- **Output**: Static export, basePath `/national_capital_region_data` in production
- **Styling**: Tailwind CSS 4
- **State**: Zustand (UI state, localStorage persistence) + React Context (data loading) + Nuqs (URL state)
- **Map**: React Leaflet 5 (lazy loaded, no SSR)
- **Charts**: Plotly.js (basic dist)
- **Table**: TanStack Table 8 + TanStack Virtual
- **AI**: Gemini API (`@google/generative-ai`) for chat
- **Build scripts**: tsx (`build-data.ts`, `generate-correlations.ts`)
- **Testing**: Vitest (unit), Playwright (e2e)

## Project layout

```
src/
  app/                    Next.js App Router entry (layout, page)
  components/
    DataProvider.tsx      Data loading context (single source of truth)
    map/                  Leaflet choropleth + drill-down
    plot/                 Plotly time-series
    table/                TanStack ranked table
    chat/                 Gemini chat panel
    sidebar/, info/, legend/, layout/, shared/
  lib/
    data/                 Loaders + types
    store/                Zustand store
    color/                Color scales
    config/               App config
    gemini/               Gemini client (base64-encoded key)
data/                     Source CSV.xz from social-data-commons
scripts/                  build-data.ts, generate-correlations.ts
public/                   Static assets (built data and geo are gitignored)
e2e/                      Playwright specs
```

## Getting started

```sh
npm install
npm run build:data    # one-time: build JSON lookups from data/*.csv.xz
npm run dev           # http://localhost:3000
```

`build:data` is required before `dev` or `build` because the dashboard reads from `public/data/*.json`, which is not committed.

### Environment variables

Create `.env.local` for local development:

```
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
```

The key is base64-encoded at build time (see `next.config.ts`) and exposed to the client as `NEXT_PUBLIC_GEMINI_KEY_B64`. Without it, the chat panel is disabled but the dashboard otherwise works.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build:data` | Decompress `data/*.csv.xz`  `public/data/*.json` |
| `npm run build` | Production static export to `./out/` |
| `npm run build:correlations` | Generate cross-variable correlations JSON |
| `npm run lint` | ESLint via `next lint` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end tests |

## Data flow

All data loads through `DataProvider` context (`src/components/DataProvider.tsx`). Components never fetch JSON directly. The provider:

1. Fetches `public/data/{level}.json` lookups on demand.
2. Loads `measure_info.json` (variable metadata) and `entity_info.json` (region names).
3. Computes available years and geographic levels per variable.
4. Caches results in memory.

Map, plot, and table components read from this context plus Zustand UI state (selected variable, year, region, color scale, etc.). Selections are synced to the URL via Nuqs for shareable links.

The dashboard displays `_geo20` geography only. `_geo10` variants exist for researcher downloads but are not surfaced in the UI.

## Deployment

GitHub Actions (`.github/workflows/build.yml`):

1. `npm ci`
2. `npm run build:data`
3. `npm run build` (with `NEXT_PUBLIC_GEMINI_API_KEY` from secrets)
4. Upload `./out/` to GitHub Pages

Build runs on every push to `main`.

## Related repositories

- [`social-data-commons`](../social-data-commons) — Python data pipelines that produce the wide CSV inputs in `data/`.
- [`virginia_public_health_data`](../virginia_public_health_data) — Sister Virginia dashboard (same architecture). NCR and VA dashboards must stay architecturally in sync.

## Conventions

- Server components by default; client components only where interactivity demands it.
- `@/*` path alias for imports from `src/`.
- Prettier: `printWidth: 120`, no semicolons, single quotes, `trailingComma: 'es5'`.
- TypeScript types on all exported function signatures.
- Components kept under ~200 lines; extract sub-components when growing larger.
