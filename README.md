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
- Live API data pending secure proxy configuration.

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
- A Google Apps Script or backend proxy should receive those posts and append rows to the Google Sheet.

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
```

## Next Actions

- Configure Google Sheet logging endpoint.
- Decide whether ClearBid, Ministry Companion, and KIM APIs will be accessed through one shared proxy or separate proxy endpoints.
- Add live status polling after proxy endpoints are available.
- Build Phase 2 panels after Phase 1 data flow is stable.
