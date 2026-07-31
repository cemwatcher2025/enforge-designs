from __future__ import annotations

import base64
import io
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import onnxruntime as ort
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import snapshot_download
from PIL import Image
from pydantic import BaseModel, Field


HOST = os.getenv("KIM_VISION_HOST", "127.0.0.1")
PORT = int(os.getenv("KIM_VISION_PORT", "8765"))
MODEL_ID = os.getenv("MOONDREAM_MODEL_ID", "Xenova/moondream2")
MODEL_DIR = Path(os.getenv("MOONDREAM_MODEL_DIR", Path(__file__).with_name("models"))).resolve()
MAX_TOKENS = int(os.getenv("MOONDREAM_MAX_TOKENS", "36"))


class AnalyzeRequest(BaseModel):
    image_data_url: str | None = Field(default=None, alias="imageDataUrl")
    image: str | None = None
    image_base64: str | None = Field(default=None, alias="imageBase64")
    prompt: str = "In one short sentence, assess only meaningful changes."
    metadata: dict[str, Any] = Field(default_factory=dict)


class AnalyzeResponse(BaseModel):
    description: str
    backend: str
    elapsedMs: int


def decode_image(payload: AnalyzeRequest) -> Image.Image:
    raw = payload.image_data_url or payload.image or payload.image_base64
    if not raw:
        raise HTTPException(status_code=400, detail="Missing imageDataUrl, image, or imageBase64.")

    if raw.startswith("data:"):
        raw = raw.split(",", 1)[1]

    try:
        data = base64.b64decode(raw)
        image = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image: {exc}") from exc

    return image


def available_providers() -> list[str]:
    return list(ort.get_available_providers())


@dataclass
class RunnerHealth:
    ok: bool
    ready: bool
    backend: str
    provider: str | None
    model_id: str
    detail: str


class DirectMLMoondreamRunner:
    """DirectML Moondream ONNX runner boundary.

    Moondream2's Transformers.js export uses three ONNX sessions:
    vision_encoder, embed_tokens, and decoder_model_merged. The HTTP server and
    DirectML provider setup are kept separate from the generation loop so the
    browser contract stays stable while the ONNX runner evolves.
    """

    backend_name = "directml-onnx"

    def __init__(self, model_id: str, model_dir: Path) -> None:
        self.model_id = model_id
        self.model_dir = model_dir
        self.provider = "DmlExecutionProvider" if "DmlExecutionProvider" in available_providers() else None
        self.model_path: Path | None = None

    def health(self) -> RunnerHealth:
        if self.provider is None:
            return RunnerHealth(
                ok=False,
                ready=False,
                backend=self.backend_name,
                provider=None,
                model_id=self.model_id,
                detail="onnxruntime-directml is installed, but DmlExecutionProvider is not available.",
            )

        return RunnerHealth(
            ok=True,
            ready=False,
            backend=self.backend_name,
            provider=self.provider,
            model_id=self.model_id,
            detail=(
                "DirectML provider is available. Model files load lazily, but the Moondream "
                "multi-session generation loop is not implemented yet."
            ),
        )

    def ensure_model(self) -> Path:
        self.model_dir.mkdir(parents=True, exist_ok=True)
        if self.model_path and self.model_path.exists():
            return self.model_path

        self.model_path = Path(
            snapshot_download(
                repo_id=self.model_id,
                local_dir=self.model_dir / self.model_id.replace("/", "__"),
                allow_patterns=[
                    "config.json",
                    "tokenizer.json",
                    "tokenizer_config.json",
                    "preprocessor_config.json",
                    "onnx/vision_encoder_q4.onnx",
                    "onnx/embed_tokens_int8.onnx",
                    "onnx/decoder_model_merged_q4.onnx",
                ],
            )
        )
        return self.model_path

    def analyze(self, image: Image.Image, prompt: str, metadata: dict[str, Any]) -> str:
        _ = image, prompt, metadata
        self.ensure_model()
        raise RuntimeError(
            "DirectML Moondream ONNX files are cached, but the multi-session generation loop is not implemented yet. "
            "The dashboard can already target this localhost server; finish DirectMLMoondreamRunner.analyze() to complete GPU inference."
        )


runner = DirectMLMoondreamRunner(MODEL_ID, MODEL_DIR)
app = FastAPI(title="KIM Local Vision Server", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://enforgedesigns.com",
        "http://enforgedesigns.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_private_network_header(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


@app.get("/health")
def health() -> dict[str, Any]:
    status = runner.health()
    return {
        "ok": status.ok,
        "ready": status.ready,
        "backend": status.backend,
        "provider": status.provider,
        "modelId": status.model_id,
        "generationImplemented": False,
        "detail": status.detail,
        "providers": available_providers(),
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    started = time.perf_counter()
    image = decode_image(payload)
    try:
        description = runner.analyze(image, payload.prompt, payload.metadata)
    except RuntimeError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return AnalyzeResponse(description=description, backend=runner.backend_name, elapsedMs=elapsed_ms)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT)
