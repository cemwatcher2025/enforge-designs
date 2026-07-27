# Enforge Command Center Proxy

Small read-only API proxy for the GitHub Pages frontend.

## Required Replit Secrets

Do not commit real token values. Add these in Replit Secrets:

```text
CLEARBID_TOKEN
MINISTRY_TOKEN
KIM_TOKEN
USAGE_LOG_WEBHOOK_URL
ALLOWED_ORIGINS=https://enforgedesigns.com,http://localhost:5173,http://127.0.0.1:5173
```

The proxy also accepts these alias names from the deployment prompt:

```text
CLEARBIDTOKEN
MINISTRYTOKEN
KIMTOKEN
USAGELOGWEBHOOK_URL
```

Optional upstream path overrides:

```text
CLEARBID_ESTIMATES_PATH=/api/estimates
CLEARBID_HEALTH_PATH=/api/health
MINISTRY_STATS_PATH=/api/stats
MINISTRY_HEALTH_PATH=/api/health
KIM_STATUS_PATH=/api/status
KIM_HEALTH_PATH=/api/health
```

## Endpoints

```text
GET /api/clearbid/estimates
GET /api/ministry/stats
GET /api/kim/status
GET /api/health
```

## Deploy on Replit

1. Create a new Node.js Repl.
2. Upload/copy the contents of this `proxy/` directory.
3. Add the required Secrets.
4. Run `npm install`.
5. Deploy.
6. Copy the deployed URL into the frontend as:

```text
VITE_COMMAND_CENTER_PROXY_URL=https://your-repl-name.your-user.repl.co
```
