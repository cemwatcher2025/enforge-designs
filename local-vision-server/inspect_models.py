from __future__ import annotations

from pathlib import Path

import onnx
from huggingface_hub import snapshot_download


MODEL_ID = "Xenova/moondream2"
REGION_MODEL_ID = "gatorchopps/moondream2-region-onnx"
MODEL_DIR = Path(__file__).with_name("models").resolve()

CORE_PATTERNS = [
    "config.json",
    "generation_config.json",
    "preprocessor_config.json",
    "special_tokens_map.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "vocab.json",
    "onnx/vision_encoder_q4.onnx",
    "onnx/embed_tokens_int8.onnx",
    "onnx/decoder_model_merged_q4.onnx",
]

REGION_PATTERNS = [
    "onnx/region_coord_encoder.onnx",
    "onnx/region_coord_decoder.onnx",
    "onnx/region_size_encoder.onnx",
    "onnx/region_size_decoder.onnx",
]


def dim_to_text(dim: onnx.TensorShapeProto.Dimension) -> str:
    if dim.dim_param:
        return dim.dim_param
    if dim.dim_value:
        return str(dim.dim_value)
    return "?"


def value_to_text(value: onnx.ValueInfoProto) -> str:
    tensor_type = value.type.tensor_type
    shape = ", ".join(dim_to_text(dim) for dim in tensor_type.shape.dim)
    dtype = onnx.TensorProto.DataType.Name(tensor_type.elem_type)
    return f"{value.name}: {dtype}[{shape}]"


def inspect_file(path: Path) -> None:
    model = onnx.load(path, load_external_data=False)
    print(f"\n{path.relative_to(MODEL_DIR)}")
    print("  inputs")
    for value in model.graph.input:
        print(f"    - {value_to_text(value)}")
    print("  outputs")
    for value in model.graph.output:
        print(f"    - {value_to_text(value)}")


def main() -> None:
    core_path = Path(
        snapshot_download(
            repo_id=MODEL_ID,
            local_dir=MODEL_DIR / MODEL_ID.replace("/", "__"),
            allow_patterns=CORE_PATTERNS,
        )
    )
    region_path = Path(
        snapshot_download(
            repo_id=REGION_MODEL_ID,
            local_dir=MODEL_DIR / REGION_MODEL_ID.replace("/", "__"),
            allow_patterns=REGION_PATTERNS,
        )
    )

    for path in [
        core_path / "onnx/vision_encoder_q4.onnx",
        core_path / "onnx/embed_tokens_int8.onnx",
        core_path / "onnx/decoder_model_merged_q4.onnx",
        region_path / "onnx/region_coord_encoder.onnx",
        region_path / "onnx/region_coord_decoder.onnx",
        region_path / "onnx/region_size_encoder.onnx",
        region_path / "onnx/region_size_decoder.onnx",
    ]:
        inspect_file(path)


if __name__ == "__main__":
    main()
