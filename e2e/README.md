# E2E (Playwright) — Virginia Public Health Data Dashboard

This directory contains end-to-end (E2E) tests powered by Playwright.

These tests are intended to run **against an already-running Next.js dev server** (`npm run dev`).

## Prerequisites

- Node/NPM installed
- Dependencies installed:

```/dev/null/shell.sh#L1-3
npm install
```

- Playwright browsers installed (one-time per machine):

```/dev/null/shell.sh#L1-3
npx playwright install
```

## Run the dev server (Terminal 1)

From the repo root:

```/dev/null/shell.sh#L1-3
npm run dev
```

By default the tests expect the app at:

- `http://127.0.0.1:3000`

## Run E2E tests (Terminal 2)

From the repo root:

```/dev/null/shell.sh#L1-3
npm run test:e2e
```

### Override the base URL

If your dev server is running on a different port/host, set `BASE_URL`:

```/dev/null/shell.sh#L1-3
BASE_URL=http://127.0.0.1:3001 npm run test:e2e
```

## Debugging

### Run the Playwright UI runner

This is helpful for stepping through tests:

```/dev/null/shell.sh#L1-3
npx playwright test --ui
```

### Run a single test file

```/dev/null/shell.sh#L1-3
npx playwright test e2e/smoke.spec.ts
```

### Headed mode (see the browser)

```/dev/null/shell.sh#L1-3
npx playwright test --headed
```

### Inspect the HTML report

The test config enables an HTML report. After a run:

```/dev/null/shell.sh#L1-3
npx playwright show-report
```

## What the smoke tests verify

The smoke tests are designed to answer: “does the dashboard load, can I navigate, and does *some* data appear?”

They use a few pragmatic “data signals”, such as:

- at least one **visible table** with at least one data row, and/or
- a visible **Leaflet map container**, and/or
- a visible **Plotly** chart container, and/or
- successful fetches of **`/data/*.json`** (or similar) assets

If you want the tests to be stricter and less brittle, add stable selectors like `data-testid` attributes on key components (measure selector, map container, table container, loading/no-data states) and update the tests to target those selectors.