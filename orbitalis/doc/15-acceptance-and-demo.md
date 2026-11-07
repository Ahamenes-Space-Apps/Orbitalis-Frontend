## 15. Acceptance, demo script and open decisions

The UX is done when ten acceptance checks pass, five usability tasks succeed with people outside the team, and the three-minute demo runs without a dead control.

### 15.1 Acceptance criteria

| ID | Criterion | How it is checked |
| --- | --- | --- |
| A1 | A preset shows its first frame in under 1 s; a cold field in under 20 s. | Timed browser flow |
| A2 | A newcomer finds the top candidate and explains the score within 60 s. | Usability task T1 |
| A3 | Every candidate view shows "Unconfirmed"; no banned word from 12.2 appears. | Text scan in the build |
| A4 | With no model and no LLM key, no dead controls remain. | Mock with all capabilities false |
| A5 | With health `offline`, presets and bundled results work end to end. | Mock offline variant |
| A6 | Opening a copied URL in a fresh tab restores field, frame and selection. | Browser flow |
| A7 | Tasks T1 to T3 complete by keyboard alone. | Manual walkthrough |
| A8 | Tokens pass contrast; automated accessibility check reports no serious issue. | CI |
| A9 | Frames streaming in cause no layout shift above 0.1. | Browser metric |
| A10 | Every error code in 8.3 renders its wording from a fixture. | Component tests |

### 15.2 Usability tasks

Five people who are not on the project, one after another, thinking aloud. Run once at G2 and again at G3; fix the top three problems after each round.

| Task | Success |
| --- | --- |
| T1. Open a preset and find the highest-ranked moving candidate. Say what its number means. | Says it is a model prediction and unconfirmed. Under 60 s. |
| T2. Enter coordinates and wait for the field. Say when it is usable. | Starts scrubbing while frames still arrive. |
| T3. Run a moving-object search and open a candidate. Say whether the original frames show the source moving. | Uses Blink or the stepper; does not treat the stack as proof. |
| T4. Find out how well the search works on injected sources. | Reaches the validation card and reads recall with its experiment label. |
| T5. Ask the assistant why a candidate ranks high. | Notices the context chip and the unconfirmed note. |

### 15.3 Three-minute demo script

| Time | On screen | Say |
| --- | --- | --- |
| 0:00 to 0:20 | Landing, open the demo preset (instant, from the bundle) | "SPHEREx maps the whole sky, one wavelength per exposure. This is our window into it." |
| 0:20 to 0:50 | Scrub by time, then by wavelength; toggle flags | "Every original frame stays available; we never hide the data." |
| 0:50 to 1:30 | Candidates: show the stored search, then the queue; select the top candidate; hover the score | "A search for faint movers. The score is a model's prediction, and every candidate is unconfirmed." |
| 1:30 to 2:10 | Detail: stack beside originals; Blink; the real-shift sentence | "The stack makes it visible. Check it against the originals. The real shift is under a pixel, so we exaggerate it and say so." |
| 2:10 to 2:35 | Methods and limits: completeness chart | "We inject fake sources and measure what we recover. This is how we know when to trust it." |
| 2:35 to 2:50 | Assistant: "Why is #042 ranked first?" | "Plain-language answers, drawn from the stored results." |
| 2:50 to 3:00 | Enter live coordinates; frames stream in | "Any patch of sky, live from the archive." |

If the live archive is slow, stay on presets; the banner says so and the story still holds. The preset to open must be a field whose stored search returns a clean candidate (UX-2).

### 15.4 Open decisions

| ID | Decision | Recommendation | Owner | By |
| --- | --- | --- | --- | --- |
| UX-1 | Are Stationary and Variable classes in v1? (U-01) | No; Moving only, plus known objects | Lead, ML eng | G1 |
| UX-2 | Which preset is the demo field? | The one whose stored search gives a clean candidate | ML eng, Lead | G2 |
| UX-3 | Default sky view | Aladin Lite when online, Simple when not or on failure | Frontend | G1 |
| UX-4 | Rate and angle units shown (D-17) | Arcsec per day, degrees east of north | ML eng | G1 |
| UX-5 | Image contract: PNG only or PNG plus array (D-06) | PNG; array only if the pixel readout is wanted | Frontend | G1 |
| UX-6 | Phone support | Read-only, as in 11.2 | Frontend | G2 |
| UX-7 | Third tab name | Keep "Candidates" in the UI; "Research Lab" stays the name in docs | Team | G1 |
| UX-8 | Assistant starter questions and knowledge pack (D-16) | Five questions, written by the ML engineer | ML eng | G2 |
