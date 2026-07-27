# Enforge Command Center

Web-based mission control dashboard hosted at `enforgedesigns.com`.

This README is the project manifest. Read it at the start of each task to stay aligned with Brandon's current priorities, phases, integration status, and decisions.

## Current Phase

Active project: Enforge Command Center

Current phase: Phase 1 MVP

Build order:

1. Phase 1: Logistics Dashboard + Communications Hub
2. Phase 2: Coding Sandbox + Documents
3. Phase 3: 3D Viewer + Ministry Panel
4. Phase 4: Settings bar, usage tracking dashboard, README integration

## Recent Decisions

- The previous puzzle-box website content has been replaced on the shipped webpage.
- Phase 1 builds the Logistics Dashboard and Communications Hub first.
- Dark theme is required by default.
- Use bold, high-contrast accent colors.
- Avoid earth tones and pastels.
- No public authentication is required initially because Brandon is the only user.
- Do not commit API tokens, bearer tokens, or private keys to this repository.
- Public GitHub Pages frontend code must call secure backend proxies or approved webhook endpoints, not private service APIs directly with embedded secrets.

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
- Live API data activates when `VITE_COMMAND_CENTER_PROXY_URL` points to the deployed proxy.

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
- Sending/reply actions disabled until connectors are configured.

## Future Panels

### Coding Sandbox

Planned:

- Quick links for ClearBid, Ministry Companion, KIM, Enforge Designs, and ROAM
- Terminal output viewer
- Active project file browser

### Documents

Planned:

- Google Docs viewer/editor links
- Key docs index
- Searchable spec and meeting-note references

### 3D Viewer

Planned:

- Unreal Engine exports
- Blender renders
- ROAM screenshots
- Concept-art gallery

### Ministry Panel

Planned:

- Service hours tracker
- Return visits list
- Bible studies in progress
- Territory map or notes
- Daily text display

## Integration References

Store real secrets outside this repo. Use environment variables, GitHub Actions secrets, backend proxy secrets, or service-specific secret stores.

Known service endpoints:

| Service | Endpoint | Status |
| --- | --- | --- |
| ClearBid | `https://price-library.replit.app` | Pending secure proxy |
| Ministry Companion | `https://ministry-companion.replit.app` | Pending secure proxy |
| KIM Assistant | `https://kim-assistant.replit.app` | Pending secure proxy |
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
```

The proxy logs API calls to the Apps Script webhook when `USAGE_LOG_WEBHOOK_URL` is configured.

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

- Configure Google Sheet logging endpoint.
- Deploy the Apps Script usage webhook and copy the `/exec` URL.
- Deploy the `proxy/` Replit service and add service tokens as Replit Secrets.
- Add GitHub Actions secrets `VITE_USAGE_LOG_ENDPOINT` and `VITE_COMMAND_CENTER_PROXY_URL`.
- Build Phase 2 panels after Phase 1 data flow is stable.
