from __future__ import annotations

import base64
import io
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import snapshot_download
from PIL import Image
from pydantic import BaseModel, Field
from tokenizers import Tokenizer


HOST = os.getenv("KIM_VISION_HOST", "127.0.0.1")
PORT = int(os.getenv("KIM_VISION_PORT", "8765"))
MODEL_ID = os.getenv("MOONDREAM_MODEL_ID", "Xenova/moondream2")
MODEL_DIR = Path(os.getenv("MOONDREAM_MODEL_DIR", Path(__file__).with_name("models"))).resolve()
MAX_TOKENS = int(os.getenv("MOONDREAM_MAX_TOKENS", "36"))
IMAGE_TOKEN_ID = -200
EOS_TOKEN_ID = 50256
SAFE_IMAGE_TOKEN_ID = 0
NUM_LAYERS = 24
NUM_HEADS = 32
HEAD_DIM = 64
HIDDEN_SIZE = 2048


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


class CaptionRequest(BaseModel):
    image_data_url: str | None = Field(default=None, alias="imageDataUrl")
    image: str | None = None
    image_base64: str | None = Field(default=None, alias="imageBase64")
    max_tokens: int | None = Field(default=None, alias="maxTokens")


class QueryRequest(CaptionRequest):
    question: str = "Describe the image in one short sentence."


class DetectRequest(CaptionRequest):
    object: str = Field(default="person")


class CaptionResponse(BaseModel):
    caption: str
    backend: str
    elapsedMs: int


class QueryResponse(BaseModel):
    answer: str
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


def decode_any_image(payload: AnalyzeRequest | CaptionRequest | QueryRequest | DetectRequest) -> Image.Image:
    return decode_image(AnalyzeRequest.model_validate(payload.model_dump(by_alias=True)))


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
        self.vision_session: ort.InferenceSession | None = None
        self.embed_session: ort.InferenceSession | None = None
        self.decoder_session: ort.InferenceSession | None = None
        self.tokenizer: Tokenizer | None = None

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
            ready=self.decoder_session is not None,
            backend=self.backend_name,
            provider=self.provider,
            model_id=self.model_id,
            detail="DirectML provider is available. Model files and sessions load lazily on first analyze.",
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
                    "generation_config.json",
                    "tokenizer.json",
                    "tokenizer_config.json",
                    "special_tokens_map.json",
                    "vocab.json",
                    "preprocessor_config.json",
                    "onnx/vision_encoder_q4.onnx",
                    "onnx/embed_tokens_int8.onnx",
                    "onnx/decoder_model_merged_q4.onnx",
                ],
            )
        )
        return self.model_path

    def ensure_sessions(self) -> None:
        model_path = self.ensure_model()
        providers = [self.provider, "CPUExecutionProvider"] if self.provider else ["CPUExecutionProvider"]
        session_options = ort.SessionOptions()
        session_options.log_severity_level = 3
        if self.vision_session is None:
            self.vision_session = ort.InferenceSession(
                str(model_path / "onnx/vision_encoder_q4.onnx"),
                sess_options=session_options,
                providers=providers,
            )
        if self.embed_session is None:
            self.embed_session = ort.InferenceSession(
                str(model_path / "onnx/embed_tokens_int8.onnx"),
                sess_options=session_options,
                providers=providers,
            )
        if self.decoder_session is None:
            self.decoder_session = ort.InferenceSession(
                str(model_path / "onnx/decoder_model_merged_q4.onnx"),
                sess_options=session_options,
                providers=providers,
            )
        if self.tokenizer is None:
            self.tokenizer = self.load_tokenizer(model_path)

    def load_tokenizer(self, model_path: Path) -> Tokenizer:
        tokenizer_data = json.loads((model_path / "tokenizer.json").read_text(encoding="utf-8"))
        for token in tokenizer_data.get("added_tokens", []):
            if token.get("content") == "<image>" and token.get("id") == IMAGE_TOKEN_ID:
                token["id"] = 50295
        tokenizer_data.pop("post_processor", None)
        return Tokenizer.from_str(json.dumps(tokenizer_data))

    def preprocess_image(self, image: Image.Image) -> np.ndarray:
        resized = image.resize((378, 378), Image.Resampling.BICUBIC)
        array = np.asarray(resized, dtype=np.float32) / 255.0
        array = (array - 0.5) / 0.5
        return np.transpose(array, (2, 0, 1))[None, :, :, :].astype(np.float32)

    def text_ids(self, text: str) -> list[int]:
        if self.tokenizer is None:
            raise RuntimeError("Tokenizer is not loaded.")
        return [int(token_id) for token_id in self.tokenizer.encode(text).ids]

    def decode_ids(self, token_ids: list[int]) -> str:
        if self.tokenizer is None:
            raise RuntimeError("Tokenizer is not loaded.")
        text = self.tokenizer.decode([token_id for token_id in token_ids if token_id >= 0], skip_special_tokens=True)
        return " ".join(text.replace("<|endoftext|>", "").split()).strip()

    def embed_ids(self, token_ids: list[int]) -> np.ndarray:
        if self.embed_session is None:
            raise RuntimeError("Embedding session is not loaded.")
        safe_ids = [SAFE_IMAGE_TOKEN_ID if token_id == IMAGE_TOKEN_ID else token_id for token_id in token_ids]
        outputs = self.embed_session.run(None, {"input_ids": np.asarray([safe_ids], dtype=np.int64)})
        return outputs[0].astype(np.float32, copy=False)

    def zero_past(self) -> dict[str, np.ndarray]:
        return {
            f"past_key_values.{layer}.{kind}": np.zeros((1, NUM_HEADS, 0, HEAD_DIM), dtype=np.float32)
            for layer in range(NUM_LAYERS)
            for kind in ("key", "value")
        }

    def decoder_run(
        self,
        inputs_embeds: np.ndarray,
        past: dict[str, np.ndarray],
        past_length: int,
    ) -> tuple[np.ndarray, dict[str, np.ndarray]]:
        if self.decoder_session is None:
            raise RuntimeError("Decoder session is not loaded.")
        sequence_length = inputs_embeds.shape[1]
        feeds: dict[str, np.ndarray] = {
            "inputs_embeds": inputs_embeds.astype(np.float32, copy=False),
            "attention_mask": np.ones((1, past_length + sequence_length), dtype=np.int64),
            "position_ids": np.arange(past_length, past_length + sequence_length, dtype=np.int64)[None, :],
            **past,
        }
        outputs = self.decoder_session.run(None, feeds)
        names = [output.name for output in self.decoder_session.get_outputs()]
        output_map = dict(zip(names, outputs))
        next_past = {
            name.replace("present", "past_key_values", 1): value
            for name, value in output_map.items()
            if name.startswith("present.")
        }
        return output_map["logits"], next_past

    def generate(self, image: Image.Image, question: str, max_tokens: int = MAX_TOKENS) -> str:
        self.ensure_sessions()
        if self.vision_session is None:
            raise RuntimeError("Vision session is not loaded.")

        pixel_values = self.preprocess_image(image)
        image_features = self.vision_session.run(None, {"pixel_values": pixel_values})[0].astype(np.float32, copy=False)
        image_token_count = int(image_features.shape[1])
        prompt = "\n\nQuestion: " + question.strip() + "\n\nAnswer:"
        token_ids = [EOS_TOKEN_ID] + ([IMAGE_TOKEN_ID] * image_token_count) + self.text_ids(prompt)
        inputs_embeds = self.embed_ids(token_ids)
        inputs_embeds[:, 1 : image_token_count + 1, :] = image_features

        past = self.zero_past()
        logits, past = self.decoder_run(inputs_embeds, past, 0)
        past_length = inputs_embeds.shape[1]
        generated: list[int] = []
        next_token = int(np.argmax(logits[0, -1, :]))

        for _ in range(max_tokens):
            if next_token == EOS_TOKEN_ID:
                break
            generated.append(next_token)
            token_embed = self.embed_ids([next_token])
            logits, past = self.decoder_run(token_embed, past, past_length)
            past_length += 1
            next_token = int(np.argmax(logits[0, -1, :]))

        return self.decode_ids(generated) or "Moondream finished but returned an empty response."

    def caption(self, image: Image.Image, max_tokens: int = MAX_TOKENS) -> str:
        return self.generate(image, "Describe this image in one concise sentence.", max_tokens)

    def query(self, image: Image.Image, question: str, max_tokens: int = MAX_TOKENS) -> str:
        return self.generate(image, question, max_tokens)

    def analyze(self, image: Image.Image, prompt: str, metadata: dict[str, Any]) -> str:
        _ = metadata
        return self.query(image, prompt, MAX_TOKENS)


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
        "generationImplemented": True,
        "endpoints": ["/analyze", "/caption", "/query", "/detect", "/health"],
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


@app.post("/caption", response_model=CaptionResponse)
def caption(payload: CaptionRequest) -> CaptionResponse:
    started = time.perf_counter()
    image = decode_any_image(payload)
    try:
        text = runner.caption(image, payload.max_tokens or MAX_TOKENS)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return CaptionResponse(caption=text, backend=runner.backend_name, elapsedMs=elapsed_ms)


@app.post("/query", response_model=QueryResponse)
def query(payload: QueryRequest) -> QueryResponse:
    started = time.perf_counter()
    image = decode_any_image(payload)
    try:
        text = runner.query(image, payload.question, payload.max_tokens or MAX_TOKENS)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return QueryResponse(answer=text, backend=runner.backend_name, elapsedMs=elapsed_ms)


@app.post("/detect")
def detect(payload: DetectRequest) -> dict[str, Any]:
    _ = decode_any_image(payload)
    raise HTTPException(
        status_code=501,
        detail=(
            "Moondream detect requires the region coordinate/size autoregressive loop. "
            "Caption/query generation is implemented first; detect is the next layer."
        ),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT)
