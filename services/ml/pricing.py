"""Pricing: arithmetic floor + LightGBM quantile (alpha .25/.50/.75) + SHAP-style reasons."""
from typing import Optional
from pydantic import BaseModel
import json
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

CRAFT_PROFILES = {
    # technique-family: (base_price, skill_multiplier, gi_premium)
    "terracotta": (450, 1.0, 0),
    "handloom": (700, 1.15, 150),
    "chanderi": (1200, 1.4, 300),
    "dhokra": (950, 1.3, 200),
    "madhubani": (800, 1.2, 100),
    "blue pottery": (900, 1.25, 150),
    "kantha": (750, 1.1, 100),
    "bandhani": (850, 1.2, 150),
}

CATEGORIES = list(CRAFT_PROFILES.keys())


class PriceInput(BaseModel):
    materialCost: int
    daysOfWork: float
    technique: str = "handloom"
    material: str = "cotton"
    region: str = "Madhya Pradesh"
    season: str = "neutral"
    dayWage: Optional[int] = None


DAY_WAGE_DEFAULT = 500

_models: dict = {}
_feature_names = ["material_cost", "days_of_work", "technique_idx", "material_idx", "season_idx", "gi"]
_techniques = CATEGORIES
_materials = ["cotton", "silk", "wool", "brass", "clay", "wood", "jute", "mixed"]
_seasons = ["neutral", "festive", "wedding"]


def _load_models():
    if _models:
        return _models
    import lightgbm as lgb  # lazy
    for alpha in ("25", "50", "75"):
        path = os.path.join(MODEL_DIR, f"pricing_lgbm_{alpha}.txt")
        if not os.path.exists(path):
            raise FileNotFoundError(path)
        _models[alpha] = lgb.Booster(model_file=path)
    return _models


def _floor(mat: int, days: float, wage: int) -> int:
    return int(round((mat + days * wage) * 1.2))


def _features(x: PriceInput) -> list:
    tech = x.technique.lower().split()[0] if x.technique else "handloom"
    technique_idx = _techniques.index(tech) if tech in _techniques else _techniques.index("handloom")
    mat = x.material.lower() if x.material else "cotton"
    material_idx = _materials.index(mat) if mat in _materials else 0
    season_idx = _seasons.index(x.season) if x.season in _seasons else 0
    gi = 1 if any(k in tech for k in ("chanderi", "dhokra", "bandhani", "blue pottery", "patola", "paithani")) else 0
    return [float(x.materialCost), float(x.daysOfWork), float(technique_idx), float(material_idx), float(season_idx), float(gi)]


def _shap_style_reasons(x: PriceInput, base: float, p50: float) -> list:
    """Per-feature contributions via ablation (leave-one-out on the fitted model's key drivers)."""
    f = _features(x)
    m = _load_models()
    contributions = []
    # ablate each feature to its category-median value and measure delta
    medians = [600.0, 3.0, float(len(_techniques) // 2), 0.0, 0.0, 0.0]
    labels = ["Raw material + labour", "Days of skilled work", "Craft technique rarity", "Material class", "Seasonal demand", "GI-tag provenance"]
    hi_texts = [
        "कच्चे माल और मेहनत का पक्का खर्च",
        "हुनर के दिनों की कीमत",
        "इस तकनीक की दुर्लभता",
        "सामग्री की गुणवत्ता",
        "त्योहारी/शादी के सीज़न की मांग",
        "GI टैग प्रमाणित उत्पाद",
    ]
    for i in range(len(f)):
        alt = list(f)
        alt[i] = medians[i]
        pred_alt = m["50"].predict([alt])[0]
        contributions.append(p50 - pred_alt)
    reasons = []
    floor = _floor(x.materialCost, x.daysOfWork, x.dayWage or DAY_WAGE_DEFAULT)
    reasons.append({
        "factor": f"Raw material + {x.daysOfWork:g} days labour (floor, arithmetic)",
        "impact_inr": floor,
        "text_hi": f"कच्चा माल ₹{x.materialCost} और {x.daysOfWork:g} दिन की मेहनत — न्यूनतम ₹{floor}",
    })
    ranked = sorted(range(len(contributions)), key=lambda i: abs(contributions[i]), reverse=True)[:3]
    for i in ranked:
        if i == 0:
            continue  # material+labour already reported as floor
        c = int(round(contributions[i]))
        if abs(c) < 20:
            continue
        reasons.append({"factor": labels[i], "impact_inr": c, "text_hi": hi_texts[i] + (f" (+₹{c})" if c > 0 else f" (₹{c})")})
    return reasons


def price_product(x: PriceInput) -> dict:
    wage = x.dayWage or DAY_WAGE_DEFAULT
    floor = _floor(x.materialCost, x.daysOfWork, wage)
    m = _load_models()
    f = _features(x)
    p25 = float(m["25"].predict([f])[0])
    p50 = float(m["50"].predict([f])[0])
    p75 = float(m["75"].predict([f])[0])
    suggested = max(int(round(p50)), floor)
    premium = max(int(round(p75)), suggested + 100)
    confidence = 0.78 if suggested > floor else 0.5
    reasons = _shap_style_reasons(x, p25, p50)
    return {
        "floor": floor,
        "suggested": suggested,
        "premium": premium,
        "confidence": round(confidence, 2),
        "reasons": reasons,
    }
