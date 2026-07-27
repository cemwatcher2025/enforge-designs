# Google Apps Script Usage Log Webhook

Target Sheet:

```text
https://docs.google.com/spreadsheets/d/16zzWBhLuOqLFp5yC2KcHH2PMfc1qgZRDmoBPImGhTdw/edit
```

## Deploy Steps

1. Open `https://script.google.com`.
2. Create a new Apps Script project.
3. Paste `usage-log-webhook.gs` into `Code.gs`.
4. Click **Deploy > New deployment**.
5. Select **Web app**.
6. Set **Execute as** to **Me**.
7. Set **Who has access** to **Anyone**.
8. Deploy and authorize.
9. Copy the `/exec` web app URL.

Use the deployed URL in:

```text
VITE_USAGE_LOG_ENDPOINT=https://script.google.com/macros/s/.../exec
```

For compatibility with the user's earlier spelling, the frontend also accepts:

```text
VITEUSAGELOG_ENDPOINT=https://script.google.com/macros/s/.../exec
```

## Payload Shape

```json
{
  "timestamp": "2026-07-26T00:00:00.000Z",
  "service": "ClearBid API",
  "purpose": "Fetch recent estimates",
  "cost": "$0.00",
  "success": true
}
```
