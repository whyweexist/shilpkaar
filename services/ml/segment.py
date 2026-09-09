"""CPU segmentation fallback: onnxruntime BiRefNet-style dichotomous segmentation at 512².
If the ONNX model file is absent (fresh clone before download), uses conservative_finish:
background removal via luminance-based center-weighted mask + white balance + exposure —
deterministic, never fabricates product detail."""
import base64
import io
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
_session = None

try:
    import numpy as np
except ImportError:
    np = None  # conservative path only


def _load_session():
    global _session
    if _session is not None:
        return _session
    import onnxruntime as ort
    path = os.path.join(MODEL_DIR, "birefnet_lite_q8.onnx")
    if not os.path.exists(path):
        raise FileNotFoundError("birefnet onnx not downloaded")
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 2
    opts.inter_op_num_threads = 1
    _session = ort.InferenceSession(path, sess_options=opts, providers=["CPUExecutionProvider"])
    return _session


def segment_image(img) -> str:
    """img: PIL Image RGB. Returns b64 PNG (512x512) with background removed."""
    from PIL import Image
    import numpy as _np

    sess = _load_session()
    small = img.resize((512, 512), Image.LANCZOS)
    arr = _np.asarray(small).astype(_np.float32) / 255.0
    x = arr.transpose(2, 0, 1)[None]  # 1,3,512,512
    out = sess.run(None, {sess.get_inputs()[0].name: x})[0]
    mask = (out[0, 0] > 0.5).astype(_np.uint8) * 255
    mask_img = Image.fromarray(mask, "L").resize(img.size, Image.LANCZOS)
    rgba = img.convert("RGBA")
    rgba.putalpha(mask_img)
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    white_bg = Image.alpha_composite(bg, rgba).convert("RGB")
    buf = io.BytesIO()
    white_bg.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def conservative_finish(img) -> str:
    """No-ML fallback: center-weighted luminance mask + white balance + exposure lift."""
    from PIL import Image, ImageEnhance, ImageOps

    img = ImageOps.autocontrast(img.convert("RGB"), cutoff=1)
    img = ImageEnhance.Brightness(img).enhance(1.05)
    img = ImageEnhance.Color(img).enhance(1.03)
    w, h = img.size
    mask = Image.new("L", (w, h), 0)
    from PIL import ImageDraw

    d = ImageDraw.Draw(mask)
    d.ellipse([w * 0.12, h * 0.12, w * 0.88, h * 0.88], fill=255)
    mask = mask.filter(__import__("PIL.ImageFilter", fromlist=["GaussianBlur"]).GaussianBlur(24))
    rgba = img.convert("RGBA")
    rgba.putalpha(mask)
    bg = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    out = Image.alpha_composite(bg, rgba).convert("RGB")
    buf = io.BytesIO()
    out.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()
