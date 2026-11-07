## 5. Explorer screens

The Explorer takes a visitor from nothing to frames streaming over a sky map with candidates on top in three interactions: choose a field, watch it build, scrub through it.

### 5.1 Field entry (Add)

Shown as the landing state when the URL has no field, and as a popover from the field chip.

- **Search box** accepts an object name or coordinates (degrees, or `10h52m04s +57d28m11s`). The client parses coordinates itself; names call `GET /resolve?q=` after a short pause and offer suggestions. A resolved result shows the coordinates and a "Use these" button.
- **Radius** selector (0.05°, 0.1° default, 0.25°, up to the server cap, 0.5°). Values above the cap are clamped with a one-line reason.
- **Release** selector from `GET /releases`.
- **Preset cards** from `GET /presets`: name, one line on why it is interesting, thumbnail. The challenge's test targets (Barnard's Star, Epsilon Indi B, WISE 0855, RW Aurigae, R Draconis) are the suggested set. A preset opens in about a second from the demo bundle.
- **Submit** calls `POST /fields`, updates the URL, opens the event stream. `ORB-API-001` errors appear inline under the offending input.

### 5.2 Field build, streaming

The screen is never empty while data arrives. Each SSE event has a defined visual effect.

| Event | What the visitor sees |
| --- | --- |
| `snapshot` | Any cached frames appear at once; the scrubber ticks for them are filled. |
| `found` | Header line "Found 84 observations" and a progress bar at 0 of 84. If it takes longer than 10 s, the line reads "Archive is slow, still trying". |
| `frame` | A filled tick appears on the scrubber at its date. The first frame fades in over the skeleton; later frames never move the view or change the stretch. |
| `progress` | Stage text such as "Downloading cutouts, 23 of 84" beside the bar. |
| `warning` | A quiet counter ("2 skipped") that opens a log drawer. No modal. |
| `done` | The bar collapses to a chip: `84 frames · QR2 · 14 Jun to 28 Oct`. Run search becomes available. |
| `error` | An inline panel with the plain-language reason and a Retry button. Frames already received stay usable. |

If the visitor leaves, the stream closes and the backend stops after a short grace period. Returning to the same URL resumes through the idempotent `POST /fields` and `Last-Event-ID` replay, with the note "Loading resumed".

### 5.3 Sky view and frame viewer

Layers, bottom to top:

1. Background: Aladin Lite (online context) or Simple (dark canvas, works offline).
2. Frame image: the selected frame PNG, placed by the field's common WCS (U-05). Masked pixels are transparent.
3. Known objects, muted (`overlays/known`).
4. Hypothesis overlay for Planet X, dotted (`overlays/hypothesis`).
5. Candidate markers: solid ring = moving, dashed ring = variable (U-01), selected = larger with halo.
6. Trails (path of a candidate across frames).
7. Cursor readout and axes.

**Layer control** is a collapsible panel docked beside the map, not chips on top of it. It holds the layer toggles with counts, opacity for the frame image, Trails, and Hide known objects (the same switch as in the queue).

**Scrubber** (Add), a bar along the bottom:

- A track with one tick per frame, ordered by **Time** (default) or **Wavelength**, switchable. Hollow ticks are frames not loaded yet; clicking one shows a spinner and "waiting for this frame".
- Play and pause, speed 1 to 8 frames per second, step with the arrow keys.
- A frame chip: date, wavelength in µm, detector, release. A Flags button shows `flags.png` over the frame.
- **Show** selector: *Single frame*, *Group* (from `GET /fields/{id}/groups`, by wavelength band or time window) or *Difference* (`/diff.png` with two pickers, a and b). The original frames always stay available.
- The stretch is fixed after the first frames, so playback does not flicker. A small label states it.

**Candidate markers while scrubbing.** At frame time *t* a marker is drawn at `position + k × rate × (t − t_ref)` along its motion direction, where *k* is the exaggeration slider. The marker for the stack epoch sits at the detected position; `t_ref` must come from the API (U-04).

**Interactions**

- Click a marker or a queue row: select. The URL updates, the row and marker highlight together, the detail drawer opens (6.2).
- Hover a marker: tooltip `#042 · moving · model 0.92 · unconfirmed`.
- Click empty sky: a small popover with coordinates (copy) and "Spectrum here" when a spectrum can be extracted (`GET /fields/{id}/spectrum?ra=&dec=`).
- Scroll or +/− zoom; the reticle recentres on the selection, or the field if nothing is selected.
- If Aladin Lite fails to load or the archive is offline, the view switches to Simple with a toast.

### 5.4 Candidate queue (Keep, Change)

- One header: **Candidates** with the subtitle "unconfirmed · ranked by model score (cnn-0.1)", or "ranked by stack SNR" when no model ran. The collapse chevron stays.
- Filter chips: All N, Moving N and, only if U-01 is accepted, Variable N. A sort menu: Score, SNR, Rate, Ordinal.
- **Row**: rank, `#ordinal`, class tag, rate in arcsec per day, then the score. Model scores show a bar on a fixed 0 to 1 scale; SNR shows a number only, so a stack SNR is never compared against a model probability. A second line gives SNR and the number of frames used.
- Hover a row to highlight its marker; selecting a row selects the marker.
- **Empty, no search yet:** "No search has been run for this field." with a Run moving-object search button (disabled with the reason until the field has built, `ORB-RS-001`).
- **Empty, search found nothing:** "No moving-object candidates above threshold. That is a valid result; see Methods and limits for how sensitive the search is."
- Lists over 200 rows are virtualised.
