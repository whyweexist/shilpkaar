"""Build comps embeddings .npz (idempotent with train_pricing — kept separate per spec)."""
import os

import numpy as np

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")


def main():
    os.makedirs(MODEL_DIR, exist_ok=True)
    rng = np.random.default_rng(2026)
    cats = ["terracotta", "handloom", "chanderi", "dhokra", "madhubani", "blue pottery", "kantha", "bandhani"]
    n, dim = 240, 16
    emb = rng.normal(0, 1, (n, dim)).astype(np.float32)
    emb = emb / np.linalg.norm(emb, axis=1, keepdims=True)
    prices = (rng.lognormal(6.5, 0.35, n) * 100).astype(np.float32)
    categories = np.array([cats[i % len(cats)] for i in range(n)])
    np.savez_compressed(
        os.path.join(MODEL_DIR, "comps_embeddings.npz"),
        embeddings=emb,
        prices=prices,
        categories=categories,
    )
    print(f"[build_comps] written {n} embeddings to models/comps_embeddings.npz")


if __name__ == "__main__":
    main()
