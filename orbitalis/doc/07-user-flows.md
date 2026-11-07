## 7. User flows

Seven flows cover the product. The main journey, a visitor going from a field to candidates to evidence, is drawn first; the table gives every flow with its failure branches.

&#91;embedded content: main journey · 11 steps in 3 rows\]

Read the rows left to right, then right to left, then left to right. The highlighted step, comparing the stack with the original frames, is the one that turns a ranked number into evidence.

### 7.1 Flow catalogue

| ID | Flow | Steps | Ends when | If it goes wrong |
| --- | --- | --- | --- | --- |
| F1 | First visit (judge) | Landing, open a preset, scrub frames, open Candidates, open one candidate, read Methods and limits | The visitor has seen stack beside originals and the validation card | Archive offline: demo banner, same path on bundled data |
| F2 | New field from coordinates | Field entry, type or paste a name or RA/Dec, `POST /fields`, event stream, scrub while frames arrive | The `done` chip appears | `ORB-API-001` inline; `ORB-PL-002` retry later; slow archive note; partial frames stay usable |
| F3 | Moving-object search and review | Candidates tab, set motion range and frames, Run, watch the job card, review the queue, open a candidate, compare, copy the link | A candidate has been compared with its originals | `ORB-RS-001/002/003` inline; failed or timed-out job offers Run again; queue full disables Run briefly |
| F4 | Check how good the method is | Methods and limits, pick an experiment, read recall, precision and completeness, optionally Run validation | The visitor can state what the numbers apply to | No experiment yet: "No validation run for this field" with Run validation, or a link to the synthetic field |
| F5 | Ask the assistant | Select a candidate, open the dock, choose a starter question, read the streamed answer, follow a linked reference | An answer is shown with its context chip | `ORB-AS-001/002/003/004` messages; the rest of the app is unaffected |
| F6 | Degraded or offline session | Health turns `degraded` or `offline`, banner appears, visitor continues on cached or demo data | The visitor can finish the demo | Last rung `ORB-SYS-002`: full-page retry |
| F7 | Open a shared link | URL parameters, idempotent `POST /fields`, state restored (frame, selection, view) | The screen matches the sender's | Field no longer cached: "Rebuilding this view" and a normal build |
