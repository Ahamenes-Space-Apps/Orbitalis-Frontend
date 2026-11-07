# ORBITALIS — UX Design & User Flows

Nov 3, 2026 · @zahir

This design turns the frontend team's Explorer mock into a full UX design for ORBITALIS: every screen, flow and state, tied to the SDD v1.1 endpoints, plus the gaps that must be settled before screens are final.

The document is split into parts so each concept can be read on its own. Read them in order for the full picture, or jump to the topic you need.

| # | Part | Covers |
| --- | --- | --- |
| 1 | [Purpose and inputs](01-purpose-and-inputs.md) | What this doc is, the inputs it draws on, and how to read it. |
| 2 | [UX principles](02-ux-principles.md) | The nine rules the whole design optimises for. |
| 3 | [The frontend mock](03-frontend-mock.md) | Annotated inventory of the mock, defects to fix, and what it does not cover yet. |
| 4 | [Information architecture](04-information-architecture.md) | Tabs, always-visible chrome, URL state and capability gating. |
| 5 | [Explorer screens](05-explorer-screens.md) | Field entry, streaming build, sky view and frame viewer, candidate queue. |
| 6 | [Candidates and detail](06-candidates-and-detail.md) | Moving-object search, candidate detail, methods and limits, assistant panel. |
| 7 | [User flows](07-user-flows.md) | The main journey and the seven-flow catalogue with failure branches. |
| 8 | [States and errors](08-states-and-errors.md) | Status chips, degradation banners, plain-language error codes, waiting rules. |
| 9 | [Data contract](09-data-contract.md) | Endpoint-to-component matrix, formats and units, motion exaggeration, coordinates, images. |
| 10 | [Visual system and motion](10-visual-system-and-motion.md) | Colour tokens, encodings, type, layout and motion. |
| 11 | [Accessibility](11-accessibility.md) | WCAG target, keyboard, screen readers, and responsive behaviour. |
| 12 | [Microcopy](12-microcopy.md) | Fixed strings, words to use and avoid, and the one-line glossary. |
| 13 | [SDD gaps](13-sdd-gaps.md) | The fourteen changes or decisions the SDD does not cover yet (U-01 to U-15). |
| 14 | [Implementation notes](14-implementation-notes.md) | State, structure, rendering, mock mode, budgets, testing and build order. |
| 15 | [Acceptance and demo](15-acceptance-and-demo.md) | Acceptance criteria, usability tasks, the three-minute demo script and open decisions. |

**Conventions.** Mock elements are tagged **Keep**, **Change** or **Add**. A need the SDD cannot serve yet is tagged **U-nn** and collected in [part 13](13-sdd-gaps.md). Endpoints appear as `GET /path`; everything under `/api/v1`.
