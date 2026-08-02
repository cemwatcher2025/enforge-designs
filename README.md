# Enforge Command Center

Web-based mission control dashboard hosted at `enforgedesigns.com`.

This README is the project manifest. Read it at the start of each task to stay aligned with Brandon's current priorities, phases, integration status, and decisions.

## Current Phase

Active project: Enforge Command Center

Current phase: Phase 8 active

Build order:

1. Phase 1: Logistics Dashboard + Communications Hub - shipped
2. Phase 2: Coding Sandbox + Documents - shipped
3. Phase 3: Communications Hub wiring + Admin Panel - shipped
4. Phase 4: 3D Sandbox - active / initial viewer shipped
5. Phase 5: Ministry Panel - active / initial panel shipped
6. Phase 6: Admin API + Lindy Integration - active / initial remote config shipped
7. Phase 7: Room Awareness + KIM Avatar - active / initial avatar and browser sensors shipped
8. Phase 8: Codex Persistent World - active / initial World Engine shipped

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
- Phase 6 stores dashboard config in the Replit proxy at `data/config.json` for Lindy/browser remote management, with browser `localStorage` fallback.
- Phase 7 KIM mic/camera processing is browser-local only. ElevenLabs API key is never committed or synced to the proxy; it is stored only in browser localStorage through KIM settings.
- The Studio Camera panel uses browser `getUserMedia` for a local-only webcam preview. It does not record, upload, or send video to a server.
- The KIM Vision panel samples the shared Studio Camera stream only when camera preview is active and analysis is enabled. It defaults to local Moondream2 inference through Hugging Face Transformers.js, but uses event-driven triggers so routine visual assessments avoid paid vision-token costs and unnecessary local model runs. Proxy endpoint mode remains available as a fallback.
- A local GPU vision server lives in `local-vision-server/`. It exposes `GET /health`, `POST /analyze`, `POST /caption`, `POST /query`, and `POST /detect` on `http://127.0.0.1:8765`, installs `onnxruntime-directml`, caches the Moondream ONNX files, and runs caption/query generation through DirectML. `/detect` is exposed but returns `501` until the region coordinate/size autoregressive loop is implemented.
- Phase 8 turns the 3D Sandbox panel into a mode-switched tool: Sandbox mode remains local/freeform, and World mode loads persistent scene state from the Replit proxy.
- The ROAM Interaction Library PDF has been converted into a portable interaction grammar for the dashboard, ROAM, Unreal Engine, and future projects. Canonical files live in `world-design/`.

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

Phase 6 status:

- Admin panel is accessible from the dashboard settings control and `/admin`.
- Panel visibility toggles shipped for Dashboard, Comms Hub, Coding Sandbox, Documents, Settings, 3D Sandbox, and Ministry.
- Simple up/down panel ordering shipped.
- Theme toggle shipped with dark/light persistence.
- API endpoint label editing shipped for ClearBid, Ministry Companion, and KIM.
- Project card and document link add/remove/edit controls shipped.
- Admin config loads from `GET /api/admin/config` when the proxy is reachable.
- Admin config autosaves to `POST /api/admin/config` and falls back to browser `localStorage` if the proxy is unreachable.
- Admin panel shows connected/local-fallback sync status.
- KIM settings shipped for voice enablement, wake word, mic/camera toggles, ElevenLabs voice ID, and browser-local ElevenLabs API key.

### KIM Avatar + Room Awareness

Phase 7 status:

- Fixed cyan-blue KIM hologram avatar shipped with idle/listening/speaking/standby visual states.
- Browser speech synthesis shipped for fast command confirmations.
- ElevenLabs text-to-speech queue shipped for greetings and longer responses when a local API key is entered.
- Skip and sleep/wake controls shipped on the avatar.
- Web Speech API wake-word listener shipped for Chrome/Edge-compatible browsers.
- Voice commands shipped for showing/hiding panels, opening projects, switching theme, reading ministry stats, checking unread email/calendar placeholders, staging ministry hours, help, sleep, and wake.
- Camera presence detection shipped with hidden video/canvas frame diffing, privacy dots, and no recording or uploads.
- Admin KIM settings shipped; API key remains local and is stripped from remote admin config sync.

### Studio Camera

Status:

- Local camera preview panel shipped.
- Start, stop, camera selector, mirror toggle, and local PNG snapshot download shipped.
- Camera stream stays in the browser; no recording or upload behavior is implemented.
- Requires HTTPS or localhost browser permissions for camera access.

### KIM Vision

Status:

- Camera-aware visual assessment panel shipped.
- Uses the existing Studio Camera stream and stays inactive while the camera is off.
- Default routine log interval is every 900 rendered frames, with a manual Analyze Now button. Older saved 240-frame defaults are migrated to 900 frames so the panel does not flood the log while Brandon is simply sitting at the computer.
- KIM Vision also runs a quiet motion probe every 10 rendered frames. Probes do not spam routine log entries, but if motion crosses the learned trigger they freeze the current camera frame immediately and send that frozen snapshot to the model. This prevents slow actions such as standing up or leaving the room from being analyzed only after the person is already gone.
- KIM Vision V2 adds a real-time situational sensor loop. It now probes motion every 10 rendered frames, estimates the strongest motion region, records real-time sensor events, and keeps a browser-local scene memory separate from the slower caption feed.
- KIM Vision V2 scene memory tracks presence, activity, confidence, recent motion region, and learned entities such as dog, fan, and held object. GPU/Moondream captions enrich this memory after events instead of being the only awareness mechanism.
- KIM Vision V2 deduplicates near-identical feed entries and suppresses repeated scene-memory update events when the remembered room state has not meaningfully changed.
- KIM Vision keeps a 3-second rolling frame buffer from recent probes. When motion finally crosses a trigger, KIM can send the earliest useful motion frame from that buffer instead of the later threshold-crossing frame; buffered assessments are labeled in the trigger text.
- KIM Vision now treats sustained mild movement as meaningful. Two close motion probes above the learned room baseline can trigger analysis after about 14 seconds, so slow standing, reaching, or walking does not need one large motion spike to be noticed.
- Automatic model assessments are event-driven: cheap local brightness/motion checks run first, and Moondream/proxy analysis fires only when motion or lighting crosses configurable thresholds and the cooldown window is open.
- Automatic deep model assessment is disabled by default through the KIM Vision `Deep auto` toggle so meaningful changes can be logged quickly without making the dashboard sluggish. Manual `Analyze now` still runs Moondream.
- Repeated stable background details are discouraged in the vision prompt so KIM focuses on changed people, animals, objects, posture, activity, or interruptions.
- Recent KIM Vision assessments persist to browser `localStorage` with trigger, brightness, motion, mode, timestamp, kind, and note.
- KIM Vision assessment entries now display the active analysis path and elapsed assessment time, such as Browser model, GPU server, Proxy, or Stats only. This makes it clear whether slow observations came from browser-local Moondream or the faster local DirectML server.
- KIM Vision now writes a log entry for every scheduled frame check, even when motion stays below the deep-analysis threshold, so Brandon can tell it is actively sampling. Routine checks are visually subdued; meaningful notices and model observations remain highlighted.
- KIM Vision Memory v1 stores a lightweight browser-local baseline with sample count, usual brightness, usual motion, last seen timestamp, and last deep observation. This is the first step toward KIM learning the room over time instead of repeatedly captioning stable background details.
- KIM Vision uses baseline-aware triggers after 8 samples: motion or lighting can be considered meaningful when it departs from the learned room baseline, even if the fixed motion threshold is not crossed. Current learned motion trigger is room-sensitive: max of usual motion + 4%, 2.1x usual motion, or 7%. The baseline uses warmup averaging first, then an adaptive moving average so normal afternoon/evening light levels can become the new normal instead of being compared forever to an old baseline.
- KIM Vision has a short strong-motion reaction window: large movement relative to the learned baseline can trigger after about 22 seconds even when the normal model cooldown is longer. This makes KIM feel more responsive while still preventing repeated deep model calls from every small motion.
- KIM Vision trains the numeric baseline only from routine checks; triggered motion/light events update last-seen and last-observation data but do not teach KIM that high-motion moments are normal. This keeps spikes such as standing up or camera movement from poisoning the usual-motion baseline.
- KIM Vision only lets calm/stable frames train the usual-motion baseline. Moderate routine movement can still be logged, but it is not allowed to gradually redefine the room's normal motion level upward.
- KIM Vision uses a field-note style observation prompt and cleans obvious model prompt echoes before saving deep observations, so instruction fragments do not pollute the memory log. Clothing, facial expressions, stable room descriptions, and known low-confidence details are downgraded to numeric notices unless unmistakable.
- KIM Vision now keeps useful action from partially shaky model captions. If Moondream mentions an uncertain detail such as clothing or expression but also detects a real action or object, KIM strips the shaky part and logs the useful observation instead of hiding the whole result behind a generic low-confidence notice.
- KIM Vision strips recurring caption artifacts such as "man and tie" while preserving the useful action, for example rewriting the observation to "A man is standing."
- KIM Vision strips additional caption artifacts such as "blurry photo", "bald head", and couch/background guesses when they are likely model phrasing noise instead of meaningful context.
- KIM Vision avoids confident depth-direction language from single camera frames. The prompt discourages phrases such as "in front of", "behind", and "next to", and the cleaner rewrites those claims into safer language such as "visible near" or "also visible" until real spatial reasoning exists.
- Local frame stats include brightness and frame-to-frame motion.
- Local Moondream2 assessment is the default mode. The first use downloads `Xenova/moondream2` from Hugging Face and runs it in the browser with WebGPU through `@huggingface/transformers`.
- Local mode does not send snapshots to the Replit proxy or a paid vision API. It only downloads/cache-loads model files from Hugging Face.
- Local GPU Server mode is available at `http://127.0.0.1:8765` for a Windows background server. Start it with `local-vision-server/start_server.bat`. It uses ONNX Runtime DirectML with `vision_encoder_q4.onnx`, `embed_tokens_int8.onnx`, and `decoder_model_merged_q4.onnx` for local caption/query generation.
- Proxy endpoint mode remains available, defaulting to the Replit proxy `/api/kim/vision` when `VITE_COMMAND_CENTER_PROXY_URL` is configured.
- The proxy endpoint forwards snapshots only when `KIM_VISION_ENDPOINT` is configured in Replit. Without that secret, it returns a clear not-configured response.
- Local stats mode is available for zero-network, zero-model fallback analysis.

## Future Panels

### 3D Viewer / 3D Sandbox

Phase 8 status:

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
- Mode toggle shipped for Sandbox mode vs World mode.
- World mode loads persistent state from `GET /api/world/state`.
- World objects can load `.glb` / `.gltf` URLs or fall back to labeled geometric placeholders if loading fails.
- World object list, focus/select behavior, object details, action button, hover/selection feedback, and recent interaction log shipped.
- Non-interactive world decor is supported: static props render in the scene without labels, red-dot attention markers, or sidebar clutter.
- World interactions post to `POST /api/world/interactions` and persist through the proxy.
- World reset is available in the UI with confirmation.
- World object `interactionType` now accepts the expanded ROAM interaction grammar instead of only `examine`, `repair`, `collect`, and `activate`.
- World objects may include `interactions` or `properties.interactionChain`; the frontend reads both so old proxy state and new proxy state remain compatible.
- Stage reset shipped: the previous experimental object field has been replaced by Signal Station One, a coherent level with Poly Haven CC0 environment assets, gameplay-critical interactables, and non-interactive atmosphere/decor.
- Signal Station One has a repeatable builder script at `scripts/build-signal-station-one.mjs`; it resets the proxy world and rebuilds the authored stage from structured world objects.
- Procedural world primitives are supported through object `properties.primitive` for floor slabs, walls, glow strips, light volumes, and other non-asset set dressing.
- World mode now includes an initial Play mode: an on-screen avatar, WASD/arrow movement, follow camera, nearby-object detection, and `E` / button interaction.
- World mode now includes a first playable objective loop for Signal Station One: one active target at a time, current-objective progress, wrong-object feedback, target-only attention markers, and completion text.

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
| World Engine | Replit proxy `/api/world/*` | Persistent proxy JSON store |
| Hugging Face Moondream2 | `Xenova/moondream2` | Browser-local KIM Vision model |
| Local KIM Vision Server | `http://127.0.0.1:8765` | DirectML ONNX caption/query server |
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

World Engine proxy endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/world/state` | Read persistent world objects, interactions, version, and timestamp |
| `POST` | `/api/world/objects` | Add a persistent world object |
| `PATCH` | `/api/world/objects/:id` | Update position, rotation, scale, metadata, or properties |
| `DELETE` | `/api/world/objects/:id` | Remove a persistent world object |
| `POST` | `/api/world/reset` | Clear objects/interactions and start a fresh world |
| `GET` | `/api/world/interactions` | Read interaction history |
| `POST` | `/api/world/interactions` | Log a user interaction with an object |

World design grammar:

| File | Purpose |
| --- | --- |
| `world-design/interaction-library.json` | Canonical structured interaction grammar converted from the ROAM Interaction Library PDF |
| `world-design/interaction-library.csv` | Flat Unreal/DataTable-friendly export |
| `world-design/interaction-library.md` | Human-readable design guide and implementation notes |
| `src/data/interactionGrammar.ts` | Frontend interaction IDs and label formatting helper |

Interaction categories:

- Discovery
- Repair and Restoration
- Environment
- Tool-Based
- Social and NPC

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
GET /api/admin/config
POST /api/admin/config
GET /api/admin/status
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

Admin API:

- `GET /api/admin/config` returns panel order/visibility, theme, project cards, and document links.
- `POST /api/admin/config` accepts partial config updates and atomically writes `proxy/data/config.json`.
- `GET /api/admin/status` returns panel visibility, theme, content counts, proxy health, and last config update time for Lindy.
- `proxy/data/` is intentionally ignored by git because it is runtime state.

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
- Redeploy the Replit proxy after Phase 6 so Lindy can use `/api/admin/config` and `/api/admin/status`.
- Add real Gmail/Calendar proxy endpoints if KIM should read live meetings and unread email counts instead of placeholders.
- Enter the ElevenLabs API key in KIM settings on each browser where premium KIM voice should be enabled.
- Confirm the Ministry Companion upstream hours endpoint path if it differs from `/api/hours`; set `MINISTRY_HOURS_PATH` in Replit if needed.
- Add saved-scene reload/import controls if the localStorage 3D scene snapshot should become a reusable project file.
- Add curated ROAM/Unreal/Blender model URLs when production assets are ready.
- Consider adding a GitHub Pages SPA fallback if direct refreshes on `/admin` need to work reliably.
- Confirm final ClearBid and KIM source repo links if they exist outside the visible `cemwatcher2025` public repos.
- Add ROAM project link when the Unreal project location is ready.
- Add more document links through the Admin Panel as specs, plans, and meeting notes accumulate.
