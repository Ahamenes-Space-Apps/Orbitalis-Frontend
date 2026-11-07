## 1. Purpose and inputs

This document turns the frontend team's Explorer mock into a full UX design for ORBITALIS: every screen, flow and state, tied to the SDD v1.1 endpoints, plus the gaps that must be settled before screens are final.

It is stack-agnostic. React, Next, Nuxt or anything else works; the doc defines behaviour, data and wording, not components or libraries. The design is desktop-first (judges will use laptops), with a graceful tablet and read-only phone view.

| Input | What this doc takes from it |
| --- | --- |
| PRD | Audience (judges, curious public, researchers), the challenge's required behaviour (RA/Dec entry, image series, movers), optional extras (spectra, overlays, URL coordinates). |
| Data and Science Spec | Flag policy, units, what "combine" may mean, release handling. |
| SDD v1.1 | The API contract: `/fields`, `/jobs`, `/candidates`, `/experiments`, `/capabilities`, `/assistant/chat`, error codes, vocabulary (Appendix E). |
| ML Pipeline and Features brief | Two work areas (Explorer, Research Lab) plus an assistant; Research Lab = shift-and-stack, candidate ranking, validation, spectra. |
| Frontend mock (screenshot) | The look and layout the team already chose: top bar, candidate queue, sky map with markers, filter chips, motion-exaggeration slider. Running on a mock API against a synthetic validation field. |

**How to read it.** Mock elements are tagged **Keep**, **Change** or **Add**. A need the SDD cannot serve yet is tagged **U-nn** and collected in section 13. Endpoints appear as `GET /path`; everything under `/api/v1`.
