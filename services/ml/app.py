"""Shilpkaar ML service — FastAPI, CPU-only, lazy singleton models, <400MB RAM."""
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import io

from pricing import PriceInput, price_product
from comps import comps_knn

app = FastAPI(title="shilpkaar-ml")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class SegmentRequest(BaseModel):
    image_b64: str


@app.get("/health")
def health():
    return {"ok": True, "service": "shilpkaar-ml", "models_loaded": "lazy"}


@app.post("/price")
def price(inp: PriceInput):
    try:
        return price_product(inp)
    except Exception as e:  # noqa: BLE001 — service must never 500 without shape
        raise HTTPException(status_code=503, detail=f"pricing unavailable: {e}") from e


@app.post("/comps")
def comps(inp: dict):
    try:
        return comps_knn(inp)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"comps unavailable: {e}") from e


@app.post("/segment")
async def segment(file: UploadFile = File(...)):
    """CPU segmentation fallback. Accepts image ≤4MB, downscales to 512²."""
    from PIL import Image  # lazy
    data = await file.read()
    if len(data) > 4 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="image must be <= 4MB")
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"bad image: {e}") from e
    from segment import segment_image  # lazy singleton
    try:
        import base64
        out_b64 = segment_image(img)
        return {"enhanced_b64": out_b64, "width": 512, "height": 512, "backend": "onnxruntime-cpu"}
    except Exception as e:  # noqa: BLE001
        # conservative fallback: auto-contrast + white bg, no ML
        from segment import conservative_finish
        out_b64 = conservative_finish(img)
        return {"enhanced_b64": out_b64, "width": 512, "height": 512, "backend": "conservative", "note": str(e)}
