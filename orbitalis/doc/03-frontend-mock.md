## 3. The frontend mock

The mock gets the hard part right, a dense honest sky view beside a ranked queue, but it covers one of the five things a visitor must do and shows classes the SDD cannot yet produce.

&#91;image: Frontend team's Explorer mock: candidate queue, sky map with moving and variable markers, motion slider\]

### 3.1 Annotated inventory

| # | Element in the mock | Decision | Backed by |
| --- | --- | --- | --- |
| 1 | Top bar: logo, tabs Explorer / Candidates / Methods and limits | **Keep.** Mapped to the ML brief's areas in section 4. | n/a |
| 2 | Banner "Synthetic validation field · ground truth known · mock API" | **Keep, make data-driven.** One mode banner: synthetic, live, cached, demo. "mock API" shows in dev builds only. | `GET /health`, `GET /fields/{id}` (`preset`), `GET /experiments/{id}` |
| 3 | Cursor readout `RA 10h 52m 04.2s · Dec +57° 28' 11°` | **Keep, fix** the arcsecond mark (shows ° instead of ″). | frame WCS (U-05) |
| 4 | Equatorial / Galactic toggle | **Keep.** Frontend-only conversion; axes relabel. | none |
| 5 | Candidate queue panel, "ranked by score S", collapse chevron | **Change.** Remove the duplicated header, define S, add an "unconfirmed" cue. | `GET /fields/{id}/candidates` |
| 6 | Filter chips All 31 / Moving 11 / Variable 20 | **Change.** Moving maps to SDD candidates. Variable has no SDD source (U-01). | candidates list, `meta` counts |
| 7 | "Hide known objects" toggle | **Keep.** Known objects are muted markers when shown. | `GET /fields/{id}/overlays/known` (shape: U-08) |
| 8 | Ranked rows: rank, `#042`, class tag, score and bar | **Change.** Add basis (model score or stack SNR), "unconfirmed", short id from `ordinal` (U-12). | candidate list |
| 9 | Map layer chips: Stationary 509 / Moving 11 / Variable 20 / Trails | **Change.** Move to a layer control that never covers map content. Stationary needs a source list (U-01). | candidates; trails from `frames` |
| 10 | Markers: solid orange ring = moving, dashed purple ring = variable, larger glow = selected | **Keep** the encoding; add text labels at readable contrast and a motion arrow. | candidate position |
| 11 | Slider "Motion exaggerated ×25 so it is visible. Real shifts are sub-pixel." | **Keep.** The sentence must be computed from data, not hard-coded (U-11). | candidate `motion`, frame `mjd` |
| 12 | Sky view toggle Aladin Lite / Simple | **Keep both.** Aladin = online HiPS context; Simple = offline canvas using our own frames. Both need the field's WCS (U-05). | `GET /fields/{id}` grid |
| 13 | Zoom +/−, reticle button | **Keep.** Reticle recentres on the field, or on the selection if one exists. | none |
| 14 | Axes: RA ticks on top (east left), Dec ticks on left | **Keep, fix.** Top ticks repeat `10h 53m` three times; add seconds at this zoom and label every other tick. | frame WCS |

### 3.2 Defects to fix before wiring real data

- The panel header "Candidate queue · ranked by score S" appears twice (panel title and list title).
- The layer chips sit on the map and the marker `187` overlaps the "Stationary" chip.
- "Score S" is undefined, and a bare `0.92` on a progress bar reads as a verdict. It must say *model prediction* and which model.
- Purple marker labels measure roughly 2.5 to 3.4:1 against the map background in the screenshot (a JPEG, so approximate), below the 4.5:1 needed for small text. Lighten them (section 10).
- Dec readout uses ° where ″ is meant (see row 3).

### 3.3 What the mock does not cover yet

| Needed (PRD, challenge, SDD) | In the mock? | Designed in |
| --- | --- | --- |
| Enter an object name or RA/Dec; pick a preset | No | 5.1 |
| See observations as an image series with a time and wavelength scrubber | No | 5.3 |
| Field build progress while data streams in | No | 5.2, 8 |
| Per-frame metadata: date, wavelength, detector, flags | No | 5.3 |
| Run a moving-object search; watch job progress | No | 6.1 |
| Candidate detail: stack versus original frames, motion, spectrum | No | 6.2 |
| Validation results and limits (tab exists, content does not) | Partly | 6.3 |
| AI assistant panel with selection as context | No | 6.4 |
| Degraded, offline and error states | No | 8 |
| Shareable URL state | No | 4.3 |
