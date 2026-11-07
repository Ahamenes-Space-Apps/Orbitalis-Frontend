## 13. Gaps versus the SDD

The design needs fourteen changes or decisions the SDD v1.1 does not cover. Two block real data on the map (U-05, U-06), and one decides whether the mock's Stationary and Variable classes exist at all (U-01). Accepted items go into SDD v1.2 with a change-log row.

| ID | The UI needs | SDD v1.1 today | Proposed change | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| U-01 | Stationary and Variable classes (mock shows 509 and 20) | Only moving candidates and a model `predicted_category` | **Decision.** Recommend v1 = Moving only plus known objects, and the chips for the other classes hidden. Stretch: `GET /fields/{id}/sources` returning stationary sources from detection on the combined image, with a variability index from per-frame photometry. | Decision | Lead, ML eng |
| U-02 | A defined "score S" for ordering and display | `model_score` can be null; `stack_snr` always present | Candidate list returns `rank_value {value, basis: model_score or stack_snr}` and `meta.sorted_by`. | High | Lead |
| U-03 | To view the synthetic validation field with truth (the mock's whole scenario) | Experiments store metrics and trial rows, no map view | Make the showcase trial a viewable synthetic field (`synthetic: true`, preset) with overlay kind `truth` (injected position, path, outcome per source). | High | ML eng, Backend 2 |
| U-04 | Marker positions at each frame time | Candidate `frames_json` holds predicted x/y only | Add `motion.reference_mjd` and `predicted_ra`, `predicted_dec` per frame. | High | Lead |
| U-05 | To place images and draw axes | No grid or WCS in any response | `GET /fields/{id}` returns `grid {center ra/dec, pixel_scale_arcsec, rotation_deg, width, height}`; `stack.png` and per-frame cutouts return `extent {center, size}`. | **Blocker** | Backend 2 |
| U-06 | A frame list for the scrubber after a reload | Frames only arrive as SSE events or one by one | `GET /fields/{id}/frames` with `frame_ref, mjd, wavelength_um, detector, release, has_png`, sorted by time. | **Blocker** | Backend 2 |
| U-07 | To warn before a too-large search | `ORB-RS-003` only after submit | `GET /capabilities` or `POST /jobs/estimate` returns `{work, budget, ok}` for given parameters. | Medium | Lead |
| U-08 | A payload for known and hypothesis overlays | Kinds named, no shape | `{items:[{id, name, type, ra, dec, path?:[{mjd, ra, dec}]}], source, as_of}`; moving known objects need a path or an `?mjd=` parameter. | Medium | Backend 2 |
| U-09 | A spectrum for a moving candidate | `GET /fields/{id}/spectrum?ra=&dec=` is fixed-position | `GET /candidates/{id}/spectrum` follows the predicted path; points carry `wavelength_um, flux, flux_err, unit, frame_ref`. Depends on D-19. | Medium | ML eng |
| U-10 | Methods content that cannot drift from the code | Not exposed | `GET /methods`: stack policy, flag policy, model card, release notes. | Medium | Lead |
| U-12 | A short stable id for display (`#042`) | Hash `candidate_id` only | Add `ordinal`, 1-based per job, in detection order. | Low | Lead |
| U-13 | A mock server that matches the real API | Frontend uses a hand-built mock | Generate the mock from the FastAPI OpenAPI schema; fill with demo-bundle fixtures; validate responses against the schema in tests. | High | Frontend, Lead |
| U-14 | Reliable links from assistant answers | Plain text stream | The `done` event carries `references` (ids the answer mentions). | Low | Backend 2 |
| U-15 | Words for the model's `predicted_category` | `source`, `noise`, `artefact` | Fixed UI strings: "Looks like a source", "Looks like noise", "Looks like an artefact", shown beside the model score. Confirm with the ML team. | Medium | ML eng, Frontend |

U-11 (the real-shift sentence) needs no API change of its own; it is computed once U-04, U-05 and U-06 exist. It replaces the mock's hard-coded sentence.
