## 9. Data-to-UI contract

Every screen element has one source in the SDD, and every displayed quantity has one format. Where the SDD has no source yet, the item points to a U-number in section 13.

### 9.1 Endpoint to component matrix

| Endpoint | Used by | When called | Notes |
| --- | --- | --- | --- |
| `GET /health` | Mode banner | On load, then every 30 s and after any failure | Rung to banner (8.2). |
| `GET /capabilities` | App shell | On load | Gates ranking, assistant, classification, job limits. |
| `GET /releases`, `GET /presets` | Field entry, Methods | Once, cached |  |
| `GET /resolve` | Field entry | Debounced typing | Falls back to a local name list server-side. |
| `POST /fields` | Field entry, URL load | Every navigation to a field | Idempotent; safe to repeat. |
| `GET /fields/{id}` | Field chip, scrubber init, map grid | After the POST, and on reload | Needs the common grid (U-05). |
| `GET /fields/{id}/events` | Build progress | While building or while a build is live | `Last-Event-ID` resume. |
| `GET /fields/{id}/frames/{ref}.png`, `/meta`, `/flags.png` | Frame viewer | On scrub; prefetch the next two frames | Frame list for reloads is missing (U-06). |
| `GET /fields/{id}/groups`, `/groups/{gid}.png`, `/diff.png` | Show selector | On choice |  |
| `GET /fields/{id}/overlays/{kind}` | Layers | On first toggle on | `known`, `hypothesis`; payload shape U-08. |
| `POST /jobs`, `GET /jobs/{id}`, `/events`, `/cancel`, `GET /jobs?field_id=` | Candidates tab | On Run, then poll or stream | Four job kinds. |
| `GET /fields/{id}/candidates`, `/candidates/{id}`, `/stack.png`, `/frames`, `/frames/{ref}.png` | Queue, detail | On job completion; on open |  |
| `GET /fields/{id}/experiments`, `/experiments/{id}` | Methods | On tab open |  |
| `GET /fields/{id}/spectrum` | Sky popover | On click | Candidate spectrum missing (U-09). |
| `POST /assistant/chat` | Assistant | On send | Streamed `fetch`. |

### 9.2 Formats and units

| Quantity | Display | Notes |
| --- | --- | --- |
| Right ascension | `10h 52m 04.2s`; degrees in the tooltip | ICRS. Axes add seconds when zoomed in. |
| Declination | `+57° 28′ 11″` | Fix the mock's ° in place of ″. |
| Galactic | `l 149.391°, b +53.089°` | Three decimals. Client conversion only. |
| Field size | Degrees when 0.1° or more, arcmin below |  |
| Time | `2025-06-14`; full UTC time and MJD in the tooltip |  |
| Wavelength | `1.70 µm` | Two decimals. |
| Image brightness | MJy/sr | Spectrum units come from the API; confirm in the DS spec. |
| Rate and angle | `12.4″/day`, `83° (east of north)` | Convention pending (D-17). |
| Scores | Model `0.92` with version; stack SNR `6.1` | Never on the same scale. |
| Candidate id | `#042`, zero-padded `ordinal` | Full `candidate_id` in copy and provenance. |
| Detector | `D3` |  |

### 9.3 Motion exaggeration and the real-shift sentence

The sentence beside the slider is generated, not typed.

- Displayed offset at frame time *t*: `k × rate × (t − t_ref)`, with *k* from the slider.
- Real shift over the field: `rate × (t_last − t_first)`, shown in arcsec and in pixels of the field grid.
- Text: "Motion exaggerated ×25. Real shift over this field's 48 days: 0.4 px (2.5″)." If the real shift is a pixel or more: "Real shifts are visible at this scale."
- Default *k* is the smallest value that makes the largest candidate move about 3 pixels on screen, capped at 100. A ×1 "true motion" button is always present.

### 9.4 Coordinates and projection

- The map uses the field's common tangent-plane grid (reference point, pixel scale, rotation, size). Frame PNGs are already aligned to it by the backend, so placing an image is a single fixed transform and the client needs no per-frame WCS.
- RA increases to the left. Axes and the cursor readout derive from the same grid.
- Equatorial and Galactic: a fixed rotation matrix in the client (no library). The API stays ICRS only. Switching relabels the axes and grid lines and converts marker positions.
- Aladin Lite is set from the field centre and size. Simple view draws the field outline and our frames only.

### 9.5 Images

- Frame PNGs are luminance plus alpha. Alpha 0 means masked and must stay transparent. A "show masked pixels" option draws a faint hatch.
- The stretch is fixed on the server after the first frames. The client may offer brightness and contrast sliders as a display curve only; it never re-stretches per frame.
- Prefetch the next two frames when scrubbing, keep up to 50 decoded frames in memory, and cancel pending fetches when the user scrubs quickly.
- A pixel-value readout under the cursor needs the `/array` endpoint; it is optional and depends on the image contract decision (D-06).
