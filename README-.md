# ORBITALIS web

A time-aware sky explorer for repeated SPHEREx observations. Drag the time slider and stationary sources hold still while moving ones shift. Click a candidate to open a dossier with its motion, 102-band spectrum and evidence.

This is the frontend. It runs on its own: with no backend configured it serves a **deterministic synthetic field** (500 stationary sources, 20 variable, 10 moving, 1 planted high-interest candidate) from a mock API. Nothing in the demo data comes from SPHEREx.

## Run it

Requires Node 20 or newer.

```bash
npm install
npm run dev          # http://localhost:5173
```

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the build at http://localhost:4173 |
| `npm test` | 46 unit and UI tests (Vitest, jsdom) |
| `npm run typecheck` | TypeScript only |
| `npm run e2e` | Playwright browser tests (needs `npx playwright install chromium` once) |

With Docker: `docker compose up --build`, then open http://localhost:3000.

## What to try

1. **Explorer (`/`)**. Click *Epoch 1 / 2 / 3* or the play button. Moving candidates (amber rings) shift; the stars do not. Toggle *Trails*, the layer chips, and the motion exaggeration slider.
2. **Select a candidate** in the queue or on the sky. The summary card shows its numbers.
3. **Band strip.** Drag across the 102 colored ticks (or focus it and use the arrow keys). Candidates whose spectral anomaly overlaps your range get an *In band range* badge, and the range is outlined on every dossier spectrum.
4. **Dossier (`/candidates/42`)**. Epoch cutouts drawn to scale, sky-plane motion plot, spectrum with flagged bands, evidence breakdown, a "why it was prioritized" text, and the known-object cross-match.
5. **Candidates (`/candidates`)**. Move the four weight sliders and watch the ranking change. #042 stops being first when you put all the weight on motion, because its shift is small. Candidates that match a known object are multiplied by 0.7.
6. **Methods and limits (`/methods`)**. What the tool cannot claim, and a live check of the planted object's rank.
7. **Coordinate frame.** The header toggle switches the readout between Equatorial and Galactic.

### The sky view

The explorer has two renderers, switchable in the top-left panel:

- **Aladin Lite v3** (default). Loaded lazily. Our synthetic sources are drawn as a catalog on top. The real-sky backdrop is **off by default**, because the sources are synthetic and should not be read against real stars. It needs a browser with WebGL2 and a network connection.
- **Simple.** A built-in SVG sky with pan (drag), zoom (wheel or buttons) and keyboard-accessible markers. It needs no network.

If Aladin Lite cannot start, the app says so and switches to Simple automatically. You can force it with `/?renderer=svg`.

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, shadcn-style components (Radix UI + class-variance-authority), TanStack Query, Zustand, React Router, Aladin Lite v3, uPlot (spectrum), Observable Plot (motion), Vitest, Testing Library, Playwright.

## Layout

```
src/
  data/        types (the API contract), synthetic field generator, mock API client, query hooks
  lib/         coordinates, scoring, helpers
  store/       Zustand UI state (epoch, selection, filters, weights, band range)
  components/
    sky/       Aladin and SVG renderers, timeline, band strip, controls
    charts/    SpectrumChart (uPlot), MotionPlot (Observable Plot), EpochCutouts
    candidates/ queue and summary
    ui/        button, badge, card, slider, switch, tabs
  pages/       Explorer, Dossier, Candidates, Methods
  test/        UI tests
e2e/           Playwright tests
```

## Connecting a real backend

Set `VITE_API_URL=/api` (copy `.env.example` to `.env.local`). The dev server proxies `/api` to `http://localhost:8080` (change it in `vite.config.ts`). The backend can be Spring Boot, Django, FastAPI or anything else that returns this JSON. The TypeScript types in `src/data/types.ts` are the contract.

| Endpoint | Returns |
|---|---|
| `GET /api/field` | `FieldInfo`: id, name, `synthetic`, center `{ra, dec}`, `fovArcmin`, `pixelScaleArcsec`, `epochs[]`, counts |
| `GET /api/sources?class=stationary` | `[{id, ra, dec, flux}]` |
| `GET /api/candidates` | `CandidateSummary[]`: id, `cls` (`moving` or `variable`), `positions[]` (one `{ra, dec}` per epoch), displacement, flux change, `components {M,B,S,T}` in 0 to 1, `knownMatch`, `flaggedBands`, `truth` (null on real data) |
| `GET /api/candidates/{id}` | `CandidateDetail`: the summary plus `spectrum[102]`, `medianSpectrum[102]`, `offsetsArcsec[]`, `cutout`, `crossMatches[]` |
| `GET /api/candidates/{id}/explanation` | `{text, caveat, generatedBy}` |

Notes for the backend:

- Coordinates are ICRS degrees. `offsetsArcsec.dx` is ΔRA·cos(dec), east positive.
- Scores are computed in the browser from `components` so the weight sliders re-rank instantly. The backend only supplies the four components.
- The explanation endpoint is where the Claude API call belongs. Send it the candidate record only, and tell it to use no numbers that are not in the record. The mock in `src/data/explain.ts` follows the same rule.
- If you use Spring Boot, a `float4[]` column for the 102-band arrays is simpler than Parquet, and `q3c` queries need native SQL.

## What has and has not been tested

Checked automatically here: TypeScript strict typecheck, 46 tests (coordinates, scoring, the synthetic field's counts and planted object, the mock API, and the UI flows on all four pages including the Aladin-failure fallback), and a production build.

**Not checked:** real-browser rendering. The environment this was built in has no browser, so the Aladin Lite canvas, the uPlot and Observable Plot charts, and the visual layout have not been seen running, and the Playwright tests are written but have not been run. The Aladin calls were checked against the library's code, not against a live page. If something looks wrong in your browser, try `/?renderer=svg` first, then tell me what you see.

## Known limits

- All numbers come from the synthetic generator. The planted object, its spectrum and its score are made up to be found.
- "Why it was prioritized" is a template in mock mode, not a model.
- The band range and the *Flag for follow-up* and *Export report* buttons are interface only for now.
- The galactic frame changes the readout and Aladin's grid. The Simple view always draws an equatorial grid.
