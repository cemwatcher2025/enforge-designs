# KIM Local Vision Server

Local HTTP companion service for KIM Vision.

The dashboard keeps cheap motion/brightness detection in the browser. When a meaningful event or manual request needs a deeper read, the browser can post the current frame to this local server:

```text
POST http://127.0.0.1:8765/analyze
POST http://127.0.0.1:8765/caption
POST http://127.0.0.1:8765/query
POST http://127.0.0.1:8765/detect
GET  http://127.0.0.1:8765/health
```

## Start

Double-click:

```text
start_server.bat
```

The script creates `.venv`, installs dependencies, and starts the server on port `8765`.

## Current Backend

This package runs Moondream locally through ONNX Runtime DirectML:

- `onnxruntime-directml`
- CORS for `enforgedesigns.com` and local Vite
- model cache directory at `local-vision-server/models/`
- Hugging Face model id default: `Xenova/moondream2`
- greedy caption/query generation through `vision_encoder`, `embed_tokens`, and `decoder_model_merged`

Moondream2's ONNX export is split across multiple sessions (`vision_encoder`, `embed_tokens`, and `decoder_model_merged`). `DirectMLMoondreamRunner` recreates the text generation path by preprocessing the image, encoding image features, manually inserting Moondream image-token embeddings, prefilling the decoder, then stepping greedily through the KV-cache decoder loop.

`/detect` is exposed to match the official Moondream API shape, but it currently returns `501`. Detection requires the additional region coordinate/size autoregressive loop after caption/query generation.

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

`/analyze`:

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

`/caption`:

```json
{
  "imageDataUrl": "data:image/jpeg;base64,...",
  "maxTokens": 36
}
```

`/query`:

```json
{
  "imageDataUrl": "data:image/jpeg;base64,...",
  "question": "What changed in this room?",
  "maxTokens": 36
}
```

`/detect`:

```json
{
  "imageDataUrl": "data:image/jpeg;base64,...",
  "object": "dog"
}
```

## Response

```json
{
  "description": "Brandon is present and appears focused.",
  "backend": "directml-onnx",
  "elapsedMs": 420
}
```

`/caption` returns `{ "caption": "..." }`. `/query` returns `{ "answer": "..." }`.

## Model Inspection

Run this when changing quantization choices or debugging DirectML provider support:

```text
python inspect_models.py
```

Observed core shapes:

- `vision_encoder_q4.onnx`: `pixel_values FLOAT[batch, 3, 378, 378]` -> `image_features FLOAT[batch, 729, 2048]`
- `embed_tokens_int8.onnx`: `input_ids INT64[batch, sequence]` -> `inputs_embeds FLOAT[batch, sequence, 2048]`
- `decoder_model_merged_q4.onnx`: `inputs_embeds`, `attention_mask`, `position_ids`, and 24 layers of KV cache -> `logits FLOAT[batch, sequence, 51200]` plus updated KV cache
