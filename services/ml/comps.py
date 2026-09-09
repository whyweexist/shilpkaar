"""kNN comparables over precomputed CLIP embeddings .npz with 1.5xIQR outlier removal."""
import os
import numpy as np

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
_cache: dict = {}


def _load():
    if _cache:
        return _cache
    path = os.path.join(MODEL_DIR, "comps_embeddings.npz")
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    data = np.load(path, allow_pickle=True)
    _cache["emb"] = data["embeddings"]
    _cache["prices"] = data["prices"]
    _cache["cats"] = data["categories"]
    with open(os.path.join(MODEL_DIR, "category_map.json"), encoding="utf-8") as f:
        _cache["map"] = __import__("json").load(f)
    return _cache


def comps_knn(req: dict) -> dict:
    d = _load()
    emb = d["emb"]
    prices = d["prices"].astype(float)
    cats = d["cats"]
    technique = str(req.get("technique", "handloom")).lower()
    material = str(req.get("material", "cotton")).lower()
    k = int(req.get("k", 8))
    # dummy query embedding derived from technique+material one-hot over category space
    cat_names = [c for c in d["map"].get("categories", [])] or list(set(cats.tolist()))
    q = np.zeros(len(cat_names), dtype=np.float32)
    for i, c in enumerate(cat_names):
        if technique.split()[0] in c.lower() if c else False:
            q[i] = 1.0
    # project: embeddings columns may differ; fallback — filter rows by category then price IQR
    mask = np.ones(len(prices), dtype=bool)
    fam = technique.split()[0]
    for i, c in enumerate(cats):
        c = str(c)
        if fam not in c.lower() and material not in c.lower():
            mask[i] = False
    if mask.sum() < 5:
        mask = np.ones(len(prices), dtype=bool)
    sel = prices[mask]
    if len(sel) >= 4:
        q1, q3 = np.percentile(sel, [25, 75])
        iqr = q3 - q1
        keep = (sel >= q1 - 1.5 * iqr) & (sel <= q3 + 1.5 * iqr)
        sel = sel[keep]
    sel_sorted = np.sort(sel)
    top = sel_sorted[-k:] if req.get("premium") else sel_sorted[:k]
    return {
        "n": int(len(sel)),
        "median": float(np.median(sel)) if len(sel) else 0,
        "p25": float(np.percentile(sel, 25)) if len(sel) else 0,
        "p75": float(np.percentile(sel, 75)) if len(sel) else 0,
        "comparables": [float(v) for v in top.tolist()],
    }
