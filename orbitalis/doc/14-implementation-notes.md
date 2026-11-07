## 14. Frontend implementation notes

These notes hold for any framework. They say what the code must do, not which library does it.

### 14.1 Four kinds of state

| State | Lives in | Rule |
| --- | --- | --- |
| Navigation | URL (4.3) | Source of truth; links reproduce the screen. |
| Server data | A cache keyed by endpoint and ids | Fetched on demand, never edited locally. A typed client is generated from the SDD's OpenAPI. |
| Streams | Reducers fed by SSE or streamed fetch | Field and job streams are GET and can use the browser's `EventSource` with automatic `Last-Event-ID`. Chat is a POST and needs a streamed `fetch` parser. |
| UI | Component state | Panel open, hover, slider values (the slider value is also in the URL as `exag`). |

### 14.2 Structure

- **App shell**: top bar, mode banner, capability provider (`/capabilities`, `/health`), assistant dock.
- **Explorer page**: field entry; sky view made of background, frame, overlay, marker, trail and readout layers; layer panel; candidate queue; scrubber; detail drawer.
- **Candidates page**: search panel, job card, results table, detail pane (the same detail component as the drawer).
- **Methods page**: table of contents, experiment cards, model card, limits.
- **Shared**: status chip, score cell, unit and coordinate formatters (9.2), error-to-copy mapper (8.3).

### 14.3 Rendering

- Frames and markers draw on a canvas or WebGL surface. A few hundred markers are fine; if U-01 brings in hundreds of stationary sources, keep them as one batched layer with a spatial index for hit testing.
- Aladin Lite loads lazily as a background only. If it fails or the archive is offline, switch to Simple without losing selection or time position.
- Frame fetches are cancellable, prefetch two frames ahead, and keep up to 50 decoded frames.

### 14.4 Mock mode

A single setting chooses `mock` or `live`. Mock mode serves responses generated from the OpenAPI schema and filled from demo-bundle fixtures (U-13), including streams and a slow, a failing and an offline variant. The "mock API" banner appears only in mock mode.

### 14.5 Budgets

| Measure | Budget |
| --- | --- |
| First useful paint on a preset | under 2 s |
| Frame swap while scrubbing, frames prefetched | under 100 ms |
| Main-thread long tasks during playback | none over 50 ms |
| Initial JavaScript, excluding Aladin Lite | under 300 kB compressed |
| Layout shift while frames stream in | under 0.1 |

### 14.6 Testing

- Browser flows for the demo script (15.3) and the five usability tasks, run in mock mode, plus one live smoke test.
- Stored visual snapshots for the key states: empty, building, degraded, offline, error, failed job.
- Accessibility checks (automated plus keyboard walkthrough) on every page.
- Contract tests: every mock response validates against the OpenAPI schema; every error code in 8.3 has a fixture.
- A text scan fails the build if banned words from 12.2 appear in user-facing strings.

### 14.7 Build order

Aligned with SDD section 15.6. Anything not ready at G3 ships disabled through `/capabilities`.

| Gate | Frontend scope | Needs from backend |
| --- | --- | --- |
| G1 | Shell, field entry, build stream, frame viewer with scrubber, mode banner, mock mode | U-05, U-06, `POST /fields`, events |
| G2 | Candidate queue and markers, search panel and job card, detail drawer, Methods validation view | Jobs, candidates, experiments, U-02, U-04, U-12 |
| G3 | Assistant, spectrum, polish, offline rehearsal, accessibility pass | Assistant stream, U-09 if classification goes ahead |
