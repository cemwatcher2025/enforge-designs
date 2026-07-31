# KIM Local Vision Server

Local HTTP companion service for KIM Vision.

The dashboard keeps cheap motion/brightness detection in the browser. When a meaningful event or manual request needs a deeper read, the browser can post the current frame to this local server:

```text
POST http://127.0.0.1:8765/analyze
GET  http://127.0.0.1:8765/health
```

## Start

Double-click:

```text
start_server.bat
```

The script creates `.venv`, installs dependencies, and starts the server on port `8765`.

## Current Backend

This package sets up the DirectML-ready local server contract:

- `onnxruntime-directml`
- CORS for `enforgedesigns.com` and local Vite
- model cache directory at `local-vision-server/models/`
- Hugging Face model id default: `Xenova/moondream2`

Moondream2's ONNX export is split across multiple sessions (`vision_encoder`, `embed_tokens`, and `decoder_model_merged`). The server currently owns the HTTP boundary and DirectML provider validation; the full DirectML generation runner lives behind `DirectMLMoondreamRunner` in `server.py` and is intentionally isolated so the dashboard contract will not need to change as the runner is completed.

## Environment

Optional environment variables:

```text
KIM_VISION_HOST=127.0.0.1
KIM_VISION_PORT=8765
MOONDREAM_MODEL_ID=Xenova/moondream2
MOONDREAM_MODEL_DIR=local-vision-server/models
MOONDREAM_MAX_TOKENS=36
```

## Request

```json
{
  "imageDataUrl": "data:image/jpeg;base64,...",
  "prompt": "In one short sentence...",
  "metadata": {
    "brightness": 52,
    "motion": 16
  }
}
```

The server also accepts `image` or `imageBase64` as aliases for `imageDataUrl`.

## Response

```json
{
  "description": "Brandon is present and appears focused.",
  "backend": "directml-onnx",
  "elapsedMs": 420
}
```

