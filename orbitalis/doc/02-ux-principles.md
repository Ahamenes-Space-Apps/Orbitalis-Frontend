## 2. UX principles

The design optimises for one outcome: a judge sees a believable moving-object candidate within a minute, understands why it is ranked, and cannot mistake a prediction for a discovery.

1. **Never a blank screen.** Presets load in one click; a new field shows a skeleton, then frames as they stream, then results. Partial data is a normal state, not an error.
2. **Honest by construction.** Candidates are *unconfirmed*; a score is a *model prediction* with a version; unmatched real detections are not "false positives". The wording is part of the interface, not decoration (section 12).
3. **Originals one click away.** Any stacked or ranked result can be compared with the original frames it came from, at the predicted position.
4. **Every number explains itself.** Hover or focus shows unit, source and, for scores, what produced them. No unlabelled figures.
5. **Shape, colour and text together.** Moving = solid ring, variable = dashed ring, each also labelled. Nothing relies on colour alone.
6. **Optional features disappear cleanly.** `GET /capabilities` decides what is shown. A missing model or LLM key hides ranking scores or the assistant; it never leaves a dead control.
7. **State lives in the URL.** Coordinates, release, time position, selected candidate and sky view are in the address, so a link reproduces the screen (a challenge extra: embeddable coordinates).
8. **Motion is truthful.** Real shifts are often sub-pixel, so the UI may exaggerate motion but must say by how much and show the real figure computed from data.
9. **Works offline from the bundle.** If the archive is down the UI says so once, then behaves normally on demo data.
