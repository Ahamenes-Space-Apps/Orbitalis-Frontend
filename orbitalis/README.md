# ORBITALIS web

A time-aware sky explorer for repeated SPHEREx observations. Scrub through frames and stationary sources hold still while moving ones shift. Candidates are always shown as **unconfirmed**; the app never claims a detection or a discovery.

This is the frontend for the ORBITALIS API. It runs in two modes:

- **Mock mode** (default). `VITE_API_URL` is unset, so the app serves `public/mock/bundle.json`: a checked-in snapshot generated from the backend's six demo presets. Everything is populated from that real bundle, no request leaves the browser, and a "Mock API" banner says so.
- **Live mode.** `VITE_API_URL` points at the API root (including `/api/v1`). Field builds, jobs, overlays, light curves and validation records come from the backend.

The API follows the envelope in the SDD: success is `{ data, meta }`, failure is `{ error: { code, message, detail } }`, and IDs are opaque strings.

## Run it

Requires Node 20 or newer.

```bash
npm install
npm run dev          # http://localhost:5173
```

With a local backend:

```bash
# in the backend repository
ORB_OFFLINE=1 uv run uvicorn orbitalis.main:app --port 8080

# in this repository
VITE_API_URL=/api/v1 npm run dev
```

The dev server proxies `/api` to `ORB_API_PROXY_TARGET` (default
`http://localhost:8080`) and drops the browser `Origin` header, because the
hosted API only allows configured origins. Live-capable local development is
therefore:

```bash
VITE_API_URL=/api/v1 npm run dev                       # local backend
ORB_API_PROXY_TARGET=https://orbitalis-api-894548039245.me-central1.run.app \
  VITE_API_URL=/api/v1 npm run dev                     # production API
```

`.env.development.local` (gitignored) can hold `VITE_API_URL=/api/v1` for the
default dev server. The assistant only appears in live mode: mock mode has no
chat transport, so the control is hidden even if a capability snapshot says it
is enabled.

The production API is `https://orbitalis-api-894548039245.me-central1.run.app/api/v1`. There is no authentication or client-side secret.

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the build at http://localhost:4173 |
| `npm test` | Unit and UI tests (Vitest, jsdom) |
| `npm run typecheck` | TypeScript only |
| `npm run e2e` | Playwright browser tests (needs `npx playwright install chromium` once) |

With Docker: `docker compose up --build`, then open http://localhost:3000. Pass `VITE_API_URL` as a build arg for live mode.

## Screens

1. **Explorer (`/`)**. Choose one of six real-data presets or enter ICRS coordinates. The field streams frames via SSE, then a scrubber moves through time or wavelength. The candidate queue, sky view, overlay layers and frame scrubber share URL state.
2. **Candidate drawer.** Select a candidate from the queue or map. It shows the shift-and-stack against the original frames, blink/filmstrip and motion views, the quick-look light curve (grouped by wavelength), the spectrum when extraction is available, model scores only when the server provides them, and the provenance text to copy. Closing the drawer keeps `sel` in the URL, so the same link reopens it.
3. **Candidates (`/candidates`)**. Pick all compatible frames or an explicit subset, set a rate and position-angle range, choose grid density, and read the server's work estimate before running. Jobs poll to completion, can be cancelled, and reuse stored parameters when run again. Results export as CSV. Ranking controls appear only when `/capabilities` enables ranking.
4. **Methods and limits (`/methods`)**. Real stack and flag policies, releases, model availability, capability reasons, validation experiments with recall/precision intervals and completeness charts, stored-parameter reruns, and the limits of what the tool can claim.

The assistant is not rendered while `/capabilities` reports `assistant.enabled=false`. No dead controls are shown for unavailable features.

## URL state

Copied links reproduce the screen. The supported parameters are:

`ra`, `dec`, `r`, `rel`, `f` (field id), `t` (frame ref), `sel` (candidate id), `view` (`simple` or `aladin`), `sys` (`eq` or `gal`), `exag` (motion exaggeration), and `layers` (comma-separated `moving`, `static`, `known`, `hypothesis`, `trails`).

Streams, job progress and assistant state never go into the URL.

## Data honesty

- Candidates are unconfirmed. Confirmation requires independent follow-up outside this tool.
- Light curves are quick-look aperture measurements: `method.calibrated` is false and the UI labels them as such.
- Light-curve `x`, `y`, `ra` and `dec` are null unless the source was detected; `flux_mjy` and `upper_limit_mjy` are always present.
- `false positive` is not used for candidates. Precision is only discussed inside experiments, against injected sources.
- Model scores rank candidates for inspection; they are not calibrated probabilities.
- Known-object items are points. Hypothesis items are regions with a `shape` and `contains_field` flag.

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, shadcn-style components (Radix UI + class-variance-authority), TanStack Query, Zustand, React Router, Aladin Lite v3 (lazy), uPlot, Observable Plot, Vitest, Testing Library, Playwright.

## Layout

```
src/
  data/         API types, live/mock client, React Query hooks, SSE parsing
  state/        URL state (source of truth for navigation)
  store/        transient UI state (hover, playback, queue collapse)
  lib/          coordinates, parsing, formatting, motion helpers
  components/
    explorer/   field entry, sky view, queue, layers, scrubber, candidate drawer
    charts/     light curve, spectrum, completeness
    common/     mode banner, error copy, status chips, primitives
    layout/     app shell and navigation
    ui/         button, badge, card, slider, switch, tabs
  pages/        Explorer, Candidates, Methods, Not found
  test/         jsdom setup and UI tests
e2e/            Playwright tests
```

`src/data/openapi.d.ts` is generated from `openapi.json`. Response bodies are generic in the spec, so `src/data/types.ts` is the hand-written response contract.

## Testing notes

- `npm test` runs the data client, coordinate parsing, URL state and UI flows against the checked-in mock bundle. The setup shim serves `public/mock/*` from disk in jsdom.
- `npm run e2e` runs the browser smoke tests against a production build. The tests cover presets, explorer scrubber/queue/drawer, candidate estimate/run/replay, methods validation and stale-field rebuild.
- Playwright needs a Chromium download: `npx playwright install chromium`.
- Candidate stacks are included for every candidate. A few candidate-frame cutouts are unavailable from the offline backend; the drawer shows a "not loaded on the server" placeholder rather than a broken image.
