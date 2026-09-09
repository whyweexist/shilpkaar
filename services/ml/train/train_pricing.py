"""Train pricing LightGBM quantile models (alpha .25/.50/.75) on a seeded comparables dataset.

Generates >= 1200 rows across 8 craft categories with realistic Indian price distributions,
then trains 3 quantile models and saves them to models/pricing_lgbm_{25,50,75}.txt.
Run: python services/ml/train/train_pricing.py
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from pricing import CATEGORIES, _materials, _seasons  # noqa: E402

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
N_PER_CAT = 150  # 8 x 150 = 1200 rows
SEED = 2026

CRAFT_PROFILE = {
    "terracotta": (450, 1.0, 0, 60),
    "handloom": (700, 1.15, 150, 120),
    "chanderi": (1200, 1.4, 300, 400),
    "dhokra": (950, 1.3, 200, 350),
    "madhubani": (800, 1.2, 100, 150),
    "blue pottery": (900, 1.25, 150, 200),
    "kantha": (750, 1.1, 100, 130),
    "bandhani": (850, 1.2, 150, 180),
}


def gen_rows(rng: np.random.Generator):
    rows = []
    for cat in CATEGORIES:
        base, skill, gi_prem, mat_var = CRAFT_PROFILE[cat]
        for i in range(N_PER_CAT):
            material_cost = int(rng.uniform(80, 700)) + mat_var // 2
            days = float(np.round(rng.uniform(0.5, 8), 1))
            technique_idx = CATEGORIES.index(cat)
            material_idx = int(rng.integers(0, len(_materials)))
            season_idx = int(rng.integers(0, len(_seasons)))
            gi = 1 if rng.random() < 0.35 else 0
            # realistic Indian craft economics: floor first, then market realization multiplier
            labour = days * rng.uniform(350, 550)
            floor = (material_cost + labour) * 1.2
            # market price distribution around floor: median realization ~1.35x, log-normal noise
            mult = float(np.exp(rng.normal(0.30, 0.18)))  # median ≈ 1.35x
            price = floor * mult * skill
            price += gi * gi_prem * rng.uniform(0.5, 1.0)
            if season_idx == 1:
                price *= rng.uniform(1.05, 1.18)  # festive
            elif season_idx == 2:
                price *= rng.uniform(1.08, 1.25)  # wedding
            rows.append([float(material_cost), float(days), float(technique_idx), float(material_idx), float(season_idx), float(gi), float(max(price, floor))])
    return np.array(rows, dtype=np.float32)


def main():
    os.makedirs(MODEL_DIR, exist_ok=True)
    rng = np.random.default_rng(SEED)
    data = gen_rows(rng)
    X = data[:, :6]
    y = data[:, 6]
    print(f"[train] dataset: {X.shape[0]} rows, {X.shape[1]} features")

    import lightgbm as lgb

    params_base = {
        "objective": "quantile",
        "learning_rate": 0.05,
        "num_leaves": 15,
        "min_data_in_leaf": 20,
        "feature_fraction": 0.8,
        "bagging_fraction": 0.8,
        "bagging_freq": 1,
        "verbose": -1,
    }
    for alpha, tag in ((0.25, "25"), (0.50, "50"), (0.75, "75")):
        model = lgb.LGBMRegressor(n_estimators=200, alpha=alpha, **params_base, random_state=SEED)
        model.fit(X, y)
        booster = model.booster_
        path = os.path.join(MODEL_DIR, f"pricing_lgbm_{tag}.txt")
        booster.save_model(path)
        pred = model.predict(X[:5])
        print(f"[train] alpha={alpha} saved {path}; sample preds: {np.round(pred, 0).tolist()}")

    # category map for comps
    cat_map = {"categories": CATEGORIES, "materials": _materials, "seasons": _seasons}
    with open(os.path.join(MODEL_DIR, "category_map.json"), "w", encoding="utf-8") as f:
        json.dump(cat_map, f, ensure_ascii=False, indent=2)

    # comps embeddings npz (seeded deterministic small vectors per row subset)
    emb_dim = 16
    n_emb = 240
    idx = rng.choice(len(data), n_emb, replace=False)
    emb = np.stack([np.eye(emb_dim, dtype=np.float32)[i % emb_dim] + rng.normal(0, 0.05, emb_dim).astype(np.float32) for i in range(n_emb)])
    np.savez_compressed(
        os.path.join(MODEL_DIR, "comps_embeddings.npz"),
        embeddings=emb,
        prices=data[idx, 6],
        categories=np.array([CATEGORIES[int(v)] for v in data[idx, 2]]),
    )
    print(f"[train] comps_embeddings.npz written ({n_emb} rows)")
    print("[train] done")


if __name__ == "__main__":
    main()
