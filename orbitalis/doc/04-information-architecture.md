## 4. Information architecture

Three tabs, one persistent assistant panel, and a URL that reproduces the screen. The tab names are the frontend team's; each maps to an area in the ML brief and to specific SDD endpoints.

### 4.1 Tabs and what they are for

| Tab | ML brief area | Job to be done | Main endpoints |
| --- | --- | --- | --- |
| Explorer | Explorer | Pick or enter a field, watch observations arrive, scrub through time and wavelength, see candidates and known objects on the sky. | `GET /presets`, `GET /resolve`, `POST /fields`, `GET /fields/{id}/events`, `/frames/*`, `/overlays/{kind}`, `/candidates` |
| Candidates | Research Lab (search and review) | Run a moving-object search, optionally rank, review the list, compare stack with original frames, open a spectrum. | `POST /jobs`, `GET /jobs/{id}`, `GET /fields/{id}/candidates`, `GET /candidates/*`, `GET /fields/{id}/spectrum` |
| Methods and limits | Research Lab (validation) and About | Explain the method in plain words, show validation experiments, the model card, the stack policy and what the tool cannot claim. | `GET /experiments/*`, `GET /capabilities`, `GET /releases` |
| Assistant (panel) | Assistant | Ask about whatever is selected; answers grounded in stored results. | `POST /assistant/chat` |

A spectrum is not a tab. It opens from a selected candidate or from a clicked sky position, in the detail drawer (section 6.2).

### 4.2 Always-visible chrome

- **Field chip** (new): name or coordinates, radius, release, for example `RA 10h52m Dec +57°28′ · r 0.1° · QR2`. Click opens field entry (5.1).
- **Mode banner** (kept): synthetic, live, cached or demo, from field state and health.
- **Cursor readout** and **Equatorial / Galactic** toggle (kept).
- **Assistant launcher**: a docked button; hidden when the assistant is disabled.
- **Capability-aware menu items**: only features that `GET /capabilities` reports as enabled.

### 4.3 URL state

The address is the source of truth for navigation. Because `POST /fields` is idempotent by parameters, a link can carry parameters instead of an id and still work on any machine.

| Parameter | Meaning | Example |
| --- | --- | --- |
| `ra`, `dec`, `r` | ICRS degrees and radius in degrees | `ra=163.017&dec=57.469&r=0.1` |
| `rel` | Data release | `rel=qr2` |
| `f` | `field_id` once known (optional) | `f=9f2c1a7b3d4e5f60` |
| `t` | Selected frame, as `frame_ref` | `t=qr2.2025W…D3` |
| `sel` | Selected candidate | `sel=c_41ab…` |
| `view` | `aladin` or `simple` | `view=simple` |
| `sys` | `eq` or `gal` | `sys=eq` |
| `exag` | Motion exaggeration | `exag=25` |
| `layers` | Comma list of visible layers | `layers=moving,trails` |

Stream progress, job progress and chat history are never in the URL.

### 4.4 Capability gating

| `GET /capabilities` says | The UI does |
| --- | --- |
| `ranking.enabled = false` | Queue sorted by stack SNR and titled "ranked by stack SNR"; no model score column; no Run ranking control. |
| `assistant.enabled = false` | Launcher hidden; nothing else changes. |
| `classification.enabled = false` | Spectrum shows measurements only; no spectral-type estimate section. |
| Queue full (`ORB-JOB-002`) | Run buttons disabled with a short reason and retry hint. |
| Health `offline` | Demo banner; presets only; Run search enabled only if the bundle holds results for that preset. |
