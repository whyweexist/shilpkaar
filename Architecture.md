# Architecture — Shilpkaar (शिल्पkaar) Artisan Business Manager

Production-grade installable PWA: voice-first, offline-first, on-device ML. One codebase serves website + installable app.

## 1. System Diagram

```
[Phone / Desktop browser]
   │ HTTPS (camera/mic/SW require secure context)
   ▼
[shilpkaar-web] Vite 5 PWA — React 18, Tailwind, Zustand, Dexie
   │  app shell precached by SW (injectManifest, src/sw.ts)
   │  /api/* NetworkFirst (3s timeout→cache)   images CacheFirst 60-LRU
   │  ml-model cache-first never-expire       navigate→/offline fallback
   │
   │ offline: everything works locally (Dexie + outbox + on-device ML)
   ▼
[shilpkaar-api] Fastify 4 (Node 20) :4000
   │  JWT (phone+OTP dev:123456) • Zod validation • Idempotency-Key on writes
   │  /api/auth /api/products /api/orders /api/insights /api/sync /api/help
   │  /s/:artisanSlug/:productSlug  SSR microstore (OG tags, wa.me, QR)
   │  /s/.../qr                    PNG QR (qrcode lib, scannable)
   │  errors: {code, message, messageHi, retryable} → client speaks messageHi
   │
   ▼ proxied with cold-start retry (503→backoff, "AI service waking up…")
[shilpkaar-ml] FastAPI (Python 3.11) :8000 — CPU only, <400MB RAM
   │  POST /price     LightGBM quantile α=.25/.50/.75 + SHAP-style ablation reasons
   │  POST /segment   onnxruntime CPU 512² (BiRefNet-style) → conservative fallback
   │  POST /comps     kNN over precomputed embeddings .npz + 1.5×IQR removal
   │  GET  /health    Render health check
   │  lazy singleton models; uploads guarded ≤4MB
```

## 2. Monorepo (pnpm workspaces + Turborepo)

| Package           | Stack                            | Role                                                                                                           |
| ----------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `apps/web`        | React 18 + Vite 5 + TS strict    | installable PWA, offline store, on-device ML                                                                   |
| `apps/api`        | Fastify 4 + TS strict            | auth, products, orders, insights, microstore, sync                                                             |
| `services/ml`     | FastAPI + lightgbm + onnxruntime | pricing/segment/comps, `package.json` shim so `pnpm dev` runs uvicorn                                          |
| `packages/shared` | TS + Zod                         | types, schemas, GST machine (tested), ONDC builder (tested), ontology (803 terms), lessons, HSN, tokens, seeds |

`pnpm dev` boots web:5173 + api:4000 + ml:8000 in parallel with colour-coded turbo logs.

## 3. Frontend internals

- **Design system**: `src/design/tokens.css` — locked palette (maroon/terracotta/gold/cream), radii, shadows, fonts (Tiro Devanagari + Inter + Noto Indic), 430px column, blockprint SVG 4% gutters. All screens reproduce the reference visual language (§4).
- **State**: `store/appStore` (lang/online/outbox/toast/mlBackend), `store/addStore` (hero flow draft), `store/assistedStore` (multi-artisan PIN profiles).
- **Offline (Dexie)**: tables products/media/orders/outbox/artisans. Every mutation local-first → `enqueueOutbox` with `crypto.randomUUID()` idempotency key → SW `sync` drains `POST /api/sync`; iOS fallback via `visibilitychange`/`online` → `tryDrain()`. Sync chip on Home: "N items waiting to sync".
- **ML (browser)**: `ml/modelManager.ts` lazy-loads transformers.js v3 only on first use — never in main bundle (verified: separate 197KB chunk, initial JS 154KB gz ≤180KB budget). Backend chain: WebGPU → WASM → server `/segment`; low-end (deviceMemory<3 or WASM>6s) skips to server; never leaves user stuck. Segmentation model: `onnx-community/BiRefNet_lite` q8 (RMBG-1.4 behind `VITE_USE_RMBG=1` flag only — non-commercial licence). **Never MODNet** (portrait matting — fails on pots/stoles).
- **Enhancement pipeline (F2)** `ml/segmentation.ts`: mask → gray-world auto white balance inside mask → cream backdrop → contact shadow under mask centroid → 1:1/3:4/4:5 WebP renditions. No generative invention — enhancement only.
- **Fidelity gate (F3)** `ml/fidelity.ts`: hand-rolled ΔE00 (Lab, sampled patches in mask, ≤3.0), SSIM (luminance stats, ≥0.92), edge-IoU (≥0.97). Failure → conservative edit (crop+exposure) + spoken Hindi why.
- **ASR (F4)** `ml/asr.ts`: Web Speech API primary (hi/bn/ta/en-IN); whisper-tiny fallback when unavailable.
- **Copy generation**: deterministic ontology-driven templates (no key needed); claim gate hedges GI-tag/pure-silk/organic/natural-dye unless verified. Anthropic path optional server-side.
- **Ontology repair**: `lib/copyGen.ts` — Levenshtein + Indic Soundex phonetic match against 803 curated terms (Hindi+English); repairs logged and shown on confirm screen for the demo.
- **TTS**: `speechSynthesis` correct lang; every generated text read back before confirm.
- **PWA**: manifest standalone #6B1E10, start_url /?source=pwa, shortcuts (New product, Orders), share_target, maskable icons, iOS meta + install sheet; update toast "नया अपडेट तैयार है" (no silent reloads); /offline fallback.

## 4. API internals

- `routes/auth.ts` — OTP request/verify (dev 123456 logged), JWT, `/api/me` dev fallback.
- `routes/products.ts` — CRUD, media multipart ≤4MB, price proxy w/ honest floor+median fallback flagged `fallback:true`, channel eligibility engine (photos/HSN/GST blockers), publish w/ below-floor 422 block.
- `routes/orders.ts` — list/detail/status advance; returns triage voice-captured.
- `routes/insights.ts` — earnings, funnel, best product, pending settlement, price advice.
- `routes/microstore.ts` — SSR OG page + WhatsApp buy button + scannable QR PNG.
- `routes/sync.ts` — idempotent outbox drain; assisted-mode callback log.
- `db.ts` — seeded deterministic store (Rajesh Kumar, 12 products, 24 orders) booting with zero env; Prisma schema in `prisma/schema.prisma` for DATABASE_URL Postgres.

## 5. ML service internals

- `pricing.py` — floor arithmetic `(material + days×wage)×1.2`; LightGBM quantiles from `models/pricing_lgbm_{25,50,75}.txt`; SHAP-style reasons via leave-one-out ablation (each feature → category median, measure Δprediction); Hindi sentences per factor.
- `train/train_pricing.py` — seeded (2026) 1200 rows × 8 crafts, realistic Indian economics (log-normal realization ~1.35× floor, season multipliers, GI premium); commits generator + trained models + comps .npz + category_map.json.
- `comps.py` — kNN filter same technique/material family, 1.5×IQR outlier removal.
- `segment.py` — onnxruntime 512² if ONNX present; else deterministic conservative finish (auto-contrast + WB + center mask) — never fabricates.

## 6. Data flow — hero listing (F1, ≤4 min)

capture(5 guided shots + coach) → enhance(=segment+WB+shadow+crops) → fidelity gate numbers shown → speak (ASR + ontology repair) → copy gen + claim gate → TTS read-back → confirm/correct → price (floor/suggested/premium + क्यों? spoken) → channels (eligibility + one-tap fix) → publish (outbox; drains on reconnect) → done (share, QR, ONDC payload + GeM CSV).

## 7. Deployment

- **Codespaces**: devcontainer Node20+Python3.11, public ports 5173/4000/8000; postCreate = install → pip install → train models → build shared → tests. Zero env needed.
- **Render (render.yaml)**: static web (SPA rewrite, `/s/*` routed to API service), Node api (health /health), Python ml (uvicorn $PORT, health /health), Postgres free via fromDatabase. Cold starts handled by client retry + honest fallback messages; ephemeral disk tolerated (store is deterministic-seeded; media base64 capped for demo).

## 8. Performance

- Initial JS 154KB gz (≤180 ✓), transformers.js lazy 197KB gz separate chunk.
- ML models lazy; fonts preloaded via Google Fonts with display=swap; images lazy.
- FCP/TTI targets validated on Moto G4 throttle budget by minimal deps (Zustand/Dexie/React-Router only in shell).

## 9. Security

- Helmet (v11 for Fastify 4), rate-limit 100/min, CORS, JWT, Zod everywhere, 4MB upload guard, no secrets in client, idempotency keys, errors carry Hindi text only (no stack leaks).
