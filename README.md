# Enforge Command Center

Web-based mission control dashboard hosted at `enforgedesigns.com`.

This README is the project manifest. Read it at the start of each task to stay aligned with Brandon's current priorities, phases, integration status, and decisions.

## Current Phase

Active project: Enforge Command Center

Current phase: Phase 5 active

Build order:

1. Phase 1: Logistics Dashboard + Communications Hub - shipped
2. Phase 2: Coding Sandbox + Documents - shipped
3. Phase 3: Communications Hub wiring + Admin Panel - shipped
4. Phase 4: 3D Sandbox - active / initial viewer shipped
5. Phase 5: Ministry Panel - active / initial panel shipped

## Recent Decisions

- The previous puzzle-box website content has been replaced on the shipped webpage.
- Phase 1 builds the Logistics Dashboard and Communications Hub first.
- Dark theme is required by default.
- Use bold, high-contrast accent colors.
- Avoid earth tones and pastels.
- No public authentication is required initially because Brandon is the only user.
- Do not commit API tokens, bearer tokens, or private keys to this repository.
- Public GitHub Pages frontend code must call secure backend proxies or approved webhook endpoints, not private service APIs directly with embedded secrets.
- Phase 2 should remain utility-focused: repository launch cards, active project selection, document index, and read-only deploy status.
- Phase 3 admin changes use browser `localStorage` only. No backend database or public write token is committed.
- Gmail and Google Calendar panels use safe link-out/deep-link behavior until a real OAuth-backed connector exists.
- Phase 4 uses Three.js from a CDN at runtime so the main Vite bundle stays lighter. Models load client-side only and are not uploaded.
- Phase 5 Ministry Panel reads through the Replit proxy. The public frontend never receives the Ministry Companion token.

## Active Panels

### Logistics Dashboard

Purpose:

- ClearBid estimate volume and status
- Ministry Companion hours, return visits, and studies
- KIM status and pending tasks
- Calendar/schedule summary
- API status indicators

Phase 1 status:

- UI shell built.
- Connection status cards built.
- Frontend proxy integration built.
- Live proxy data is deployed and active through `VITE_COMMAND_CENTER_PROXY_URL`.

### Communications Hub

Purpose:

- Email triage status
- Slack or message status if connected
- Lindy conversation/action status
- Quick-reply staging

Phase 1 status:

- UI shell built.
- Quick-reply draft box built.
- Local usage logging built.
- Gmail Inbox, Compose, and Google Calendar deep links built.
- Gmail and Calendar connection indicators built.
- Live unread email and next-event data are placeholders until a Google OAuth or backend connector is added.

### Coding Sandbox

Phase 2 status:

- Quick-access project cards shipped for ClearBid, Ministry Companion, KIM Assistant, Enforge Designs, and ROAM.
- Active project selector shipped.
- Project cards open GitHub repos or live Replit apps in new tabs.
- Read-only GitHub Actions status feed shipped for `cemwatcher2025/enforge-designs`.
- ClearBid and KIM GitHub repos were not found under `cemwatcher2025`; their cards currently point to live Replit apps.
- ROAM uses a placeholder link until an Unreal/GitHub location is available.

### Documents

Phase 2 status:

- Searchable client-side document index shipped.
- Key doc link shipped for the Enforge Command Center Build Spec.
- Documents open in a new tab instead of embedding Google Docs inline.
- Additional docs can be added through the Admin Panel or the default config in `src/config.ts`.

### Admin Panel

Phase 3 status:

- Admin panel is accessible from the dashboard settings control and `/admin`.
- Panel visibility toggles shipped for Dashboard, Comms Hub, Coding Sandbox, Documents, Settings, 3D Sandbox, and Ministry.
- Simple up/down panel ordering shipped.
- Theme toggle shipped with dark/light persistence.
- API endpoint label editing shipped for ClearBid, Ministry Companion, and KIM.
- Project card and document link add/remove/edit controls shipped.
- Admin config saves to browser `localStorage`.

## Future Panels

### 3D Viewer / 3D Sandbox

Phase 4 status:

- Three.js viewport shipped inside the configurable 3D Sandbox panel.
- Orbit controls, grid floor, lighting, fog/background, and axes helper shipped.
- Built-in preset scenes shipped: Empty grid, Primitives, and Terrain test.
- Demo model buttons shipped for primitives, low-poly tree, simple building, and terrain.
- `.glb` / `.gltf` URL loading and local file loading shipped.
- Loaded models auto-center and auto-scale.
- Wireframe toggle, axes toggle, reset camera, and PNG screenshot download shipped.
- Animated model support shipped for the first animation clip with play/pause and timeline scrubber.
- Scene object list and TransformControls shipped for selecting, moving, rotating, and scaling objects.
- Scene save writes object transforms, colors, preset, wireframe state, and loaded model source to `localStorage`.

### Ministry Panel

Phase 5 status:

- Current-month hours, return visits, Bible studies, previous-month comparison, YTD hours, average monthly hours, and publisher count cards shipped.
- Recent activity feed shipped with date, type, hours, and notes.
- Return visits list shipped with contact name, last visit date, and active / needs follow-up / paused status.
- Bible studies list shipped with contact name, progress, and last study date.
- Hours logging form shipped for date, hours, type, and notes.
- Frontend uses `GET /api/ministry/stats` and `POST /api/ministry/hours` through `VITE_COMMAND_CENTER_PROXY_URL`.
- Loading, retry/error, and empty states shipped.

## Integration References

Store real secrets outside this repo. Use environment variables, GitHub Actions secrets, backend proxy secrets, or service-specific secret stores.

Known service endpoints:

| Service | Endpoint | Status |
| --- | --- | --- |
| ClearBid | `https://price-library.replit.app` | Live through secure proxy |
| Ministry Companion | `https://ministry-companion.replit.app` | Live through secure proxy |
| KIM Assistant | `https://kim-assistant.replit.app` | Live through secure proxy |
| ElevenLabs | ElevenLabs API | Pending secure proxy |
| Lindy | `https://chat.lindy.ai` | Manual/link-out; no public API currently |

Required frontend environment variable for usage logging:

```text
VITE_USAGE_LOG_ENDPOINT=https://script.google.com/macros/s/.../exec
```

Required frontend environment variable for live dashboard data:

```text
VITE_COMMAND_CENTER_PROXY_URL=https://your-replit-proxy-url
```

## Usage Tracking

Target system: Google Sheet

Required columns:

- Timestamp
- API/service called
- Purpose of call
- Cost, if applicable
- Success/failure

Current implementation:

- `src/utils/usageTracking.ts` stores usage entries in `localStorage`.
- If `VITE_USAGE_LOG_ENDPOINT` is configured, usage entries are also posted to that endpoint.
- `VITEUSAGELOG_ENDPOINT` is also accepted for compatibility.
- A Google Apps Script webhook source is stored in `integrations/google-apps-script/usage-log-webhook.gs`.
- Usage tracking Sheet: `https://docs.google.com/spreadsheets/d/16zzWBhLuOqLFp5yC2KcHH2PMfc1qgZRDmoBPImGhTdw/edit`

## Proxy Server

The read-only API proxy source is stored in `proxy/`.

Proxy endpoints:

```text
GET /api/clearbid/estimates
GET /api/ministry/stats
POST /api/ministry/hours
GET /api/kim/status
GET /api/health
```

Required proxy secrets:

```text
CLEARBID_TOKEN
MINISTRY_TOKEN
KIM_TOKEN
USAGE_LOG_WEBHOOK_URL
ALLOWED_ORIGINS=https://enforgedesigns.com,http://localhost:5173,http://127.0.0.1:5173
MINISTRY_HOURS_PATH=/api/hours
```

The proxy logs API calls to the Apps Script webhook when `USAGE_LOG_WEBHOOK_URL` is configured.

The proxy source includes `POST /api/ministry/hours`, but the deployed Replit proxy must be redeployed after this repo change before the hours logging form can succeed in production.

Current deployed proxy:

```text
https://enforge-command-center-proxy.replit.app
```

## README Update Policy

Brandon can update this README manually when project state changes.

Automatic README updates from the public dashboard are not enabled because that would require a GitHub write token in the browser, which is not acceptable for a public static site. If automatic README updates become required, build a server-side writer that uses a private GitHub token and exposes only narrow, authenticated update actions.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

The project deploys to GitHub Pages from `.github/workflows/deploy-pages.yml`.

Production domain:

```text
enforgedesigns.com
```

The workflow builds with:

```text
GITHUB_PAGES=true
CUSTOM_DOMAIN=true
VITE_COMMAND_CENTER_PROXY_URL=${{ secrets.VITE_COMMAND_CENTER_PROXY_URL }}
VITE_USAGE_LOG_ENDPOINT=${{ secrets.VITE_USAGE_LOG_ENDPOINT }}
```

## Next Actions

- Add a real Gmail/Calendar backend connector if live unread emails and live calendar events are required inside the dashboard.
- Redeploy the Replit proxy so `POST /api/ministry/hours` is available in production.
- Confirm the Ministry Companion upstream hours endpoint path if it differs from `/api/hours`; set `MINISTRY_HOURS_PATH` in Replit if needed.
- Add saved-scene reload/import controls if the localStorage 3D scene snapshot should become a reusable project file.
- Add curated ROAM/Unreal/Blender model URLs when production assets are ready.
- Consider adding a GitHub Pages SPA fallback if direct refreshes on `/admin` need to work reliably.
- Confirm final ClearBid and KIM source repo links if they exist outside the visible `cemwatcher2025` public repos.
- Add ROAM project link when the Unreal project location is ready.
- Add more document links through the Admin Panel as specs, plans, and meeting notes accumulate.
