## 11. Accessibility and responsive behaviour

The target is WCAG 2.2 AA. The candidate queue is the accessible twin of the map: anything possible on the map is possible from the list.

### 11.1 Requirements

| Area | Requirement |
| --- | --- |
| Contrast | Text 4.5:1 (large text 3:1); non-text UI parts 3:1. Tokens in 10.1 are checked before build. |
| Colour independence | Shape and text carry every category (10.2). |
| Keyboard | All controls reachable; visible 2 px focus ring. Order: top bar, queue, map, scrubber, drawer, assistant. |
| Map keys | Focus the map: arrows pan, `+`/`−` zoom, Tab cycles candidates in rank order, Enter opens detail, Esc closes the drawer or popover. Scrubber: left/right step, Space play or pause. |
| Screen readers | The map region has a live text summary ("31 candidates, 11 moving"); markers have labels; frame images get alt text from metadata ("SPHEREx frame, 1.70 µm, 14 Jun 2025, detector 3"); each chart has a "View as table" switch. |
| Live regions | Build progress announced at most every 10 percent (polite); errors assertive; banners polite. |
| Flashing | Playback starts paused. Default 2 frames per second, maximum 8, with a note that high speeds flicker. |
| Touch targets | At least 24 px, 44 px on touch devices. |
| Zoom and reflow | Usable at 200 percent text size; panels reflow at 400 percent zoom. |
| Time limits | None. Jobs run on the server and can be reopened. |

### 11.2 Responsive behaviour

| Width | Layout | Available |
| --- | --- | --- |
| 1280 px and up | Queue left, map centre, drawer right, scrubber bottom, assistant dock | Everything |
| 1100 to 1279 px | Drawer and assistant overlay the map | Everything |
| 768 to 1099 px | Queue as a bottom sheet; touch pan and pinch zoom | Everything |
| Below 768 px | Single column, read-only | Presets, frames and scrubber, candidate list and detail, Methods. Run search and Run validation show "Open on a larger screen to run analyses." The assistant is a full-screen sheet. |
