## 6. Candidates, detail, methods and assistant

These screens carry the ML team's work: run a search, judge the results against the original data, read how well the method performs, and ask questions in plain language.

### 6.1 Candidates tab: run a moving-object search

A wide layout: search panel on the left, results in the centre, detail drawer on the right when a row is open. The Explorer queue (5.4) is the compact form of the same list.

**Search panel**

- **Field**: defaults to the current field.
- **Frames**: "All compatible frames (N)" by default. "Choose frames" lists frames; ones the stack policy rejects are greyed with the reason from the `ORB-RS-002` detail. The original frames are never hidden.
- **Motion range**: a two-handle rate slider in arcsec per day and a position-angle range (full circle by default), with named presets. Preset values wait on the ML team (D-17).
- **Grid density**: Coarse, Normal, Fine. A too-large request returns `ORB-RS-003`; the form keeps its values and says "narrow the motion range or radius" (U-07 asks the API for an estimate so this can be shown before running).
- **Rank after search**: a checkbox, shown only if `ranking.enabled`.
- **Run** calls `POST /jobs` (`moving_object_search`). The same settings on the same field return the existing job and its results, so the UI says "Showing results from an earlier identical run".

**Job card** (under the form): a status chip (`queued`, `running`, `completed`, `failed`, `cancelled`), a progress bar with the stage name from `progress.stage`, elapsed time, and Cancel. Poll `GET /jobs/{id}` every second, or use `GET /jobs/{id}/events`. A failed job shows its code in plain words (section 8) and a Run again button. A job list for the field (`GET /jobs?field_id=`) lets people reopen earlier runs.

**Results table** columns: rank, `#ordinal`, class, RA and Dec, rate, position angle, stack SNR, model score (with version in the column header), frames used, an open button. Actions: copy link, download CSV (built in the browser from the list response).

### 6.2 Candidate detail

A right-hand drawer in the Explorer and a split pane in Candidates. Header: `#042`, class, an **Unconfirmed** badge that is always visible, position, and buttons Select on map, Copy link, Ask assistant.

1. **Stack versus originals** (the main view). Left: `GET /candidates/{id}/stack.png`, captioned "Shift-and-stack of 41 frames at 12.4″/day". Right: the original frame cutout at the predicted position (`GET /candidates/{id}/frames/{frame_ref}.png`) with a crosshair, a frame stepper (arrow keys), a Blink button that alternates first and last frame, and a filmstrip of all frames (lazy-loaded thumbnails). Whether the source is visibly shifting in the originals is the visual evidence; the UI never states it.
2. **Motion.** Rate, position angle, start and end position, time baseline in days, and the **real displacement over that baseline in arcsec and pixels**, computed from the data. This is the source of the "real shifts are sub-pixel" sentence beside the slider (U-11).
3. **Scores.** Stack SNR with a one-line definition. Model score with `model_version` and predicted category, plus a "What does this mean?" popover: "A prediction from a model trained on synthetic sources. It ranks candidates for inspection and does not confirm them." `null` shows "Not ranked".
4. **Spectrum** (only when available). Chart of flux against wavelength in µm with error bars. If `classification.enabled` and enough data exist, an estimated spectral type with its probabilities, labelled *estimate*; otherwise "Not enough data for a spectral type" with the reason. A moving object's spectrum must follow its path through the frames, which `GET /fields/{id}/spectrum?ra=&dec=` cannot do (U-09).
5. **Provenance.** Job id, search parameters, release, stack policy used, model version, and the frame list (date, wavelength, detector). A Copy as text button gives a block someone can paste into notes.

Loading shows skeletons. Frames not yet stored show "not loaded" in the stepper rather than failing the whole view.

### 6.3 Methods and limits

The tab where credibility is earned. A sticky table of contents on the left, sections with anchors.

1. **What ORBITALIS does.** The five core steps (search, retrieve, check quality, prepare, display) and shift-and-stack in a short plain paragraph with one small illustration.
2. **Data.** The release in use, the flag policy in one sentence, and the stack policy values: what is combined and what never is. Source: `GET /releases` and the policy (U-10).
3. **Validation.** One card per experiment from `GET /fields/{id}/experiments`: label, parameters, seed, date. Inside: recall, precision relative to injected sources, position error, and completeness against brightness and against speed as two line charts (a table of counts below with the outcome classes recovered, missed, preexisting, spurious). A fixed line states *Results apply to this experiment only.* A Run validation button starts a `validation` job for people who want to see it run.
4. **Model.** Model card: version, input size, how the training examples were made, intended use, known failure modes (U-10).
5. **Limits.** A fixed list: candidates are unconfirmed; scores are predictions; real shifts are often sub-pixel; QR2 and QR3 differ and DR1 reprocessing is expected; only the selected field and release are searched; unmatched detections in real data are not called false positives; spectral types need enough coverage; confirmation needs independent follow-up outside this tool.
6. **Credits.** NASA, IRSA and SPHEREx acknowledgement with the data release versions in use.

### 6.4 Assistant panel

A right-hand dock available in every tab, opened from the launcher and hidden when `assistant.enabled` is false.

- **Context chips** at the top show what the answers will use: field, frame, candidate, job, experiment. Defaults to the current selection and updates when it changes, with an inline note in the transcript. Each chip can be removed. The client sends ids only (`POST /assistant/chat` with `context`).
- **Starter prompts** depend on the selection: "Why is #042 ranked first?", "What does 1.7 µm mean here?", "How was this validated?", "What can this tool not tell me?"
- **Streaming**: text appears as `token` events arrive; a `tool_call` event shows a chip such as "looked up candidate #042". A Stop button aborts the stream. The client uses a streamed `fetch` because the call is a POST (D-21).
- **Linking**: `#ordinal` and frame references in answers become links that select that object, but only if it exists in the loaded data.
- **Standing footnote**: "AI answer based on this field's stored results. Candidates are unconfirmed." The panel also notes that messages go to a hosted model provider.
- **Errors**: `ORB-AS-002` "Too many questions; try again in a minute", `ORB-AS-003` "The daily assistant limit is used up; it resets tomorrow", `ORB-AS-001/004` "The assistant is unavailable right now", and the rest of the app keeps working.
- Chat history lives in memory for the session, with a Clear button. There are no accounts.
