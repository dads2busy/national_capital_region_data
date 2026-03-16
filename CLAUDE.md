# NCR Dashboard — Claude Instructions

## Project (GOAL)

This is the National Capital Region (NCR) Next.js dashboard. It displays demographic, economic, health, housing, and other indicator data on interactive maps and charts.

Data is produced by pipelines in the sdc-monorepo and copied into `data/` as wide-format compressed CSVs. `npm run build:data` transforms these into JSON lookups in `public/data/`.

Success = the dashboard builds via `npm run build` with zero TypeScript errors, renders correctly as a static export, and all data flows from data/*.csv.xz → public/data/*.json → map/chart/table components.

## Related Repos

- `/Users/ads7fg/git/sdc-monorepo` — data pipelines (Python/uv) that produce the datasets for this dashboard. Read `/Users/ads7fg/git/sdc-monorepo/CLAUDE.md` when working on data pipeline tasks.
- `/Users/ads7fg/git/virginia_public_health_data` — VA dashboard (same architecture)

## Architecture

See `/Users/ads7fg/.claude/projects/-Users-ads7fg-git-national-capital-region-data/memory/architecture.md` for the full data flow, app structure, state management, and key source files.

## Memory

Read the memory index at `/Users/ads7fg/.claude/projects/-Users-ads7fg-git-national-capital-region-data/memory/MEMORY.md` at the start of every conversation. Load specific memory files as needed based on the task.

## Stack (CONSTRAINTS — non-negotiable)

- **Framework**: Next.js 15 App Router, React 19, TypeScript strict mode
- **Output**: Static export (`output: 'export'`), basePath `/national_capital_region_data` in prod
- **Styling**: Tailwind CSS 4 + tailwind-merge. No CSS modules, no styled-components, no other CSS-in-JS.
- **State**: Zustand 5 (UI state, localStorage persistence), React Context (data loading), Nuqs (URL state for shareable links)
- **Map**: React Leaflet 5 (lazy loaded, no SSR)
- **Charts**: Plotly.js (via react-plotly.js)
- **Table**: TanStack Table 8 + TanStack Virtual
- **AI**: Gemini API (@google/generative-ai) for chat integration. Never remove or replace Gemini chat.
- **Build scripts**: tsx for Node scripts (build-data.ts, etc.)
- **Testing**: Vitest (unit), Playwright (e2e)
- **Deployment**: GitHub Pages via CI (.github/workflows/build.yml). `build:data` runs in CI — build artifacts are gitignored.

## Hard Rules (CONSTRAINTS)

- Never install a new dependency without asking first.
- Never swap a library in the stack (e.g. don't replace Leaflet with Mapbox, Zustand with Redux, Plotly with Recharts).
- All data flows through DataProvider context — never fetch JSON directly in components.
- Server components by default. Client components only when interactivity (map, chart, user input) requires it.
- `@/*` path alias for all imports from `src/`.
- Prettier config: printWidth 120, no semicolons, single quotes, trailing commas in es5 positions.
- Dashboard shows `_geo20` geography only. `_geo10` is for researcher downloads, not displayed.
- Geographic levels: county → tract → block_group (drill-down), plus civic_association, zip_code, planning_district, supervisor_district, human_services_region.
- Environment variables via `.env.local`, never hardcoded.

## Output Format (FORMAT)

- New components go in `src/components/{domain}/` (e.g. `map/`, `plot/`, `table/`, `sidebar/`).
- Data utilities go in `src/lib/data/`. Store logic in `src/lib/store/`.
- Types in `src/lib/data/types.ts` or co-located `types.ts` files.
- Build/data scripts in `scripts/`.
- Source data in `data/`. Built output in `public/data/` and `public/geo/` (gitignored).
- Keep components under 200 lines. Extract sub-components if exceeding.
- TypeScript types on all function parameters and return values for exported functions.

## Failure Conditions (what makes output unacceptable)

- TypeScript build errors (`npm run build` must pass with `ignoreBuildErrors: false`).
- Using `useEffect` to fetch data that should go through DataProvider.
- Using `useState` for data that belongs in Zustand store or URL state (Nuqs).
- Any component that imports data JSON directly instead of going through the data loading layer.
- Missing loading/error states on async data renders.
- Introducing a UI library (Material UI, shadcn, Chakra, etc.) — Tailwind utility classes only.
- SSR-incompatible code in server components (Leaflet, Plotly, window/document references).
- Hardcoded basePath or API keys.
- Removing or breaking the Gemini chat integration.
- Build artifacts (public/data/*.json, public/geo/*.geojson) committed to git.
