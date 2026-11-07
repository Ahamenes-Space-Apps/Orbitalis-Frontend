## 12. Microcopy and honesty language

Wording does scientific work the interface cannot, so these strings are fixed and shared by every screen. Tone: plain, short, second person.

### 12.1 Fixed strings

| Where | Text |
| --- | --- |
| Candidate badge, always visible | **Unconfirmed** |
| Queue subtitle, ranked | "Ranked by model score (cnn-0.1). Unconfirmed." |
| Queue subtitle, unranked | "Ranked by stack SNR. Unconfirmed." |
| Model score tooltip | "A prediction from a model trained on synthetic sources. It helps rank candidates for inspection. It does not confirm anything." |
| Stack SNR tooltip | "Signal-to-noise of the combined image at this position along this path." |
| Moving tag tooltip | "Position changes across observations at a consistent rate." |
| Variable tag tooltip (if U-01) | "Brightness changes across observations." |
| Synthetic banner | "Synthetic validation field. Sources were injected with known positions and brightness." |
| Live, cached, demo banners | "Live archive data · QR2" / "Cached data" / "Demo data" |
| Validation footer | "Results apply to this experiment only." |
| Precision caption | "Precision is measured against the sources injected in this experiment." |
| Real-data note | "Detections in real data that match nothing known are listed as candidates, not as errors." |
| Spectrum, estimate | "Estimate" label on any spectral type; otherwise "Not enough data for a spectral type" with the reason. |
| Assistant footnote | "AI answer based on this field's stored results. Candidates are unconfirmed." |

### 12.2 Words to use and avoid

| Use | Avoid |
| --- | --- |
| candidate, possible mover | discovery, found a planet, confirmed |
| model score, prediction | confidence, probability (unless calibrated) |
| recovered, missed, spurious (in experiments) | false positive (in real data) |
| stack SNR | significance, detection level |
| archive, data release | server, backend |
| "the search" | "the AI" for non-ML steps |

### 12.3 One-line glossary (tooltips)

| Term | Gloss |
| --- | --- |
| SPHEREx | NASA's infrared all-sky survey telescope; each exposure sees the sky at a different wavelength. |
| RA / Dec | Sky coordinates, like longitude and latitude. |
| Wavelength | The colour of infrared light, in micrometres (µm). |
| Detector | One of the instrument's six cameras. |
| Release (QR2) | A versioned batch of processed data from the archive. |
| MJy/sr | Surface brightness: how much infrared light arrives from a patch of sky. |
| Shift-and-stack | Shifting images to follow a guessed path, then adding them, so a faint mover can stand out. |
| Injection | Adding an artificial source with known properties to real data, to test the search. |
| Completeness | The share of injected sources that the search recovered. |
