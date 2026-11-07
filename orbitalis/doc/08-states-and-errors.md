## 8. States, feedback and degradation

Every wait, partial result and failure has a defined look. Fields and jobs share one status vocabulary, so the interface uses the same five words everywhere.

### 8.1 Status chips

| Status | Chip text and icon | Meaning to the visitor |
| --- | --- | --- |
| `queued` | Queued, clock | Accepted, waiting for a free slot. |
| `running` | Running, animated bar | Working; the stage name is shown. |
| `completed` | Completed, check | Finished; results are ready. |
| `failed` | Failed, cross | Stopped with a reason and a Retry or Run again action. |
| `cancelled` | Cancelled, dash | Stopped on request; partial results stay. |

Each chip carries text and an icon, never colour alone.

### 8.2 Degradation banners

The mode banner follows `GET /health` and the SDD's degradation ladder. One line, polite live region, dismissible for the session but it returns if the state changes.

| Ladder rung | Health | Banner text | What changes |
| --- | --- | --- | --- |
| 0 to 1 | `ok` | none (slow-archive notes appear in the build header only) | nothing |
| 2 | `degraded` | "Some observations could not be downloaded (3 of 84). Results use the rest." | Chip with a log link; counts reflect what loaded. |
| 3 | `degraded` | "The archive is not responding. Showing cached data." | Amber banner; Run search still works on cached frames. |
| 4 | `offline` | "Archive unavailable. Showing demo data." | Presets only; Run search only where the bundle holds results. |
| 5 | error `ORB-SYS-002` | Full-page: "ORBITALIS can't load its demo data. Try again." | Retry button; nothing else is shown. |

### 8.3 Error codes in plain words

The API returns `{error:{code, message, detail}}`. The UI maps the code to its own wording and never shows raw `message` text as the only explanation.

| Code | Shown as | Wording | Recovery |
| --- | --- | --- | --- |
| `ORB-API-001` | Inline | "Check the highlighted fields." | Fix and resubmit. |
| `ORB-API-002` | Panel | "We can't find that item. It may have been cleared." | Rebuild from the URL parameters. |
| `ORB-API-003` | Toast | "That run has already finished." | None needed. |
| `ORB-GW-001`, `-002`, `-004` | Toast or inline | "The archive didn't respond in time." | Retry. |
| `ORB-GW-003` | Banner | "The archive is busy; pausing requests for a moment." | Automatic retry. |
| `ORB-PL-001` | Panel | "Processing failed for this field." | Retry; copy details. |
| `ORB-PL-002` | Panel | "Too many fields are being built right now. Try again in a minute." | Retry button after a delay. |
| `ORB-PL-003` | Inline | "Loading was cancelled." | Resume button. |
| `ORB-ST-001`, `-002` | Toast | "Storage problem; results may load slower." | Retry. |
| `ORB-CORE-001` | Warning counter | "One observation file was unreadable and was skipped." | None. |
| `ORB-CORE-002` | Panel | "No usable pixels remain here after quality masking." | Choose another region. |
| `ORB-OV-001` | Layer note | "Known-object overlay is unavailable right now." | Layer disabled. |
| `ORB-JOB-002` | Inline | "The analysis queue is full. Try again in a minute." | Run disabled briefly. |
| `ORB-JOB-003` | Job card | "The search took too long and was stopped. Narrow the motion range or use fewer frames." | Run again. |
| `ORB-JOB-004` | Job card | "The server restarted during your search. Run it again; earlier work is kept." | Run again. |
| `ORB-RS-001` | Inline | "Wait for the field to finish loading before searching." | Button enables on `done`. |
| `ORB-RS-002` | Inline list | "Some selected frames can't be combined:" followed by the reasons. | Edit selection. |
| `ORB-RS-003` | Inline | "That search is too large. Narrow the motion range, radius or density." | Edit form. |
| `ORB-ML-001` | Note | "Ranking isn't available; results are ordered by stack SNR." | None. |
| `ORB-ML-002` | Note | "Ranking failed; candidates are shown unranked." | Retry ranking. |
| `ORB-AS-001`, `-004` | Panel | "The assistant is unavailable right now." | Rest of app unaffected. |
| `ORB-AS-002` | Panel | "Too many questions; try again in a minute." | Wait. |
| `ORB-AS-003` | Panel | "The daily assistant limit is used up; it resets tomorrow." | None. |
| `ORB-SYS-001` | Panel | "Something went wrong on our side." Shows a copyable request id from `detail`. | Retry. |
| `ORB-SYS-002` | Full page | See 8.2. | Retry. |

### 8.4 Loading and waiting rules

- Acknowledge every action within 100 ms (pressed state, optimistic chip). Show a spinner only after 300 ms.
- After 10 s of waiting, say what is happening ("Archive is slow, still trying"). After 60 s, offer Keep waiting or Cancel.
- Skeletons keep the layout stable: a dark map placeholder with a faint grid, grey queue rows, an empty scrubber track.
- Streaming never moves things under the cursor. New frames append to the scrubber. The candidate list changes only when a job completes, not row by row.
- A first visit to a preset shows a one-time hint: "Demo data, loaded instantly. Enter coordinates to query the live archive."
