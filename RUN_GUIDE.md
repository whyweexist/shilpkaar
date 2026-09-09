# Shilpkaar — Implementation & Execution Guide

One guide to understand what was built and to run the whole app locally end-to-end.

## 1. What this app is

**Shilpkaar (शिल्पkaar) — Artisan Business Manager**: an installable, offline-first PWA for Indian handicraft artisans. Voice-first listing creation (photo → Hindi voice description → AI copy → LightGBM price suggestion → publish to Microstore / WhatsApp / ONDC / GeM), fully usable in airplane mode with an outbox that syncs on reconnect.

## 2. How it is implemented (monorepo)

```
E:\sh
├── apps\web          React 18 + Vite 5 + TS + Tailwind + Zustand + Dexie (IndexedDB) + transformers.js (on-device ML)
│   └── src\sw.ts     Custom service worker (injectManifest): shell precache, /api network-first 3s,
│                     images LRU-60, ML models cache-first, Background-Sync outbox drain
├── apps\api          Fastify 4 + Prisma 5 (SQLite locally via dev.db) + Zod + JWT (phone+OTP, dev OTP 123456)
├── services\ml       FastAPI (CPU-only, lazy models, <400MB): POST /price (LightGBM quantiles),
│                     POST /comps (kNN), POST /segment (onnxruntime fallback), GET /health
├── packages\shared   Zod schemas, GST state machine, ONDC payload builder + tests, 803-term craft ontology,
│                     seed bundles (12 products, 12 static + 12 generated = 24 orders)
├── render.yaml       Render blueprint (api + ml + static web + Postgres)
└── .devcontainer     Codespaces: Node 20 + Python 3.11, ports 5173/4000/8000 public
```

| Service | Port | Entry point |
|---|---|---|
| web | 5173 | `apps\web` → `vite --host 0.0.0.0 --port 5173` |
| api | 4000 (`PORT`) | `apps\api\src\index.ts` → Fastify on `0.0.0.0` |
| ml | 8000 | `services\ml\app.py` → `uvicorn app:app` (run from `services\ml`) |

Key implementation notes:

- **No API keys required.** On-device transformers.js (WebGPU → WASM → server fallback); deterministic template copy generator; mocked Bhashini/OTP in dev.
- **Pricing:** arithmetic floor `(material + days × ₹500 wage) × 1.2` (publish blocked below floor) + LightGBM quantile models (α .25/.50/.75) trained by `services\ml\train\train_pricing.py`.
- **Fidelity gate:** ΔE00 / SSIM / silhouette-edge-IoU computed client-side in `apps\web\src\ml\fidelity.ts`; failures fall back to conservative edit + spoken explanation.
- **Offline:** Dexie tables + outbox with idempotency keys; sync chip in Home; `/offline` fallback route.

## 3. Prerequisites

- Node ≥ 20, pnpm ≥ 9 (`corepack enable`), Python 3.11.
- This machine already has: Node v24, pnpm 9.12.1, Python 3.11.15, `node_modules` installed.

## 4. First-time setup (from repo root `E:\sh`)

```powershell
# 1. Install JS deps
pnpm install

# 2. Python deps for the ML service
pip install -r services/ml/requirements.txt

# 3. Train pricing + comparables models (writes services\ml\models\, idempotent)
python services/ml/train/train_pricing.py
python services/ml/train/build_comps.py

# 4. Env (all optional — app boots with zero env vars; copy only to override)
copy .env.example .env

# 5. Database (SQLite dev.db) + seed verification (12 products / 24 orders / 803 terms)
$env:DATABASE_URL = "file:./dev.db"
pnpm --filter @shilpkaar/api db:push
pnpm --filter @shilpkaar/api db:seed
```

## 5. Run everything (one command)

```powershell
pnpm dev
```

This runs web + api + ml in parallel (turbo, colour-coded). Open:

- App: **http://localhost:5173**
- API health: **http://localhost:4000/health**
- ML health: **http://localhost:8000/health**

Phone testing on the same Wi-Fi: use `http://<your-lan-ip>:5173` (camera/mic need HTTPS or localhost — for real device testing use the Codespaces URL, whose ports are public HTTPS).

## 6. Run / verify each service individually

```powershell
# Web only
pnpm --filter @shilpkaar/web dev

# API only (needs ML URL if ml runs elsewhere)
$env:ML_SERVICE_URL = "http://localhost:8000"
pnpm --filter @shilpkaar/api dev

# ML only (must run from services\ml so `app:app` resolves)
cd services\ml
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Smoke tests:

```powershell
Invoke-RestMethod http://localhost:4000/api/products |
  Select-Object -ExpandProperty products | Measure-Object   # expect 12
Invoke-RestMethod http://localhost:4000/api/orders |
  Select-Object -ExpandProperty orders | Measure-Object     # expect 24
Invoke-RestMethod http://localhost:8000/health
```

Quality gates: `pnpm typecheck`, `pnpm lint`, `pnpm test` (GST machine + ONDC payload tests), `pnpm build`.

## 7. The 7-minute demo path (after `pnpm dev`)

1. Open the app on a phone → install prompt → Add to Home Screen → launch standalone.
2. Turn on **airplane mode** — Home still loads; sync chip shows offline state.
3. Tap the mic (**Bolke List Karo**) → photograph a handicraft (5 guided shots, live cut-out) → speak the description in Hindi (no typing).
4. Review screen shows the fidelity strip (Colour ✓ ΔE · Texture ✓ SSIM · Shape ✓ IoU).
5. Three price cards (Floor 🔒 / Suggested / Premium); **क्यों?** explains each factor aloud in Hindi; publishing below floor is refused with a spoken reason.
6. Airplane mode **off** → outbox drains, sync chip clears → product live on channels.
7. Open the public microstore URL on a laptop (`/s/rajesh-kumar/<slug>`), Buy-on-WhatsApp, scan the QR; show the validated ONDC beckn payload (MOCK badge) and GeM CSV export.

## 8. Configuration reference

All in `.env.example`; every var optional. The ones that matter:

| Var | Default | Purpose |
|---|---|---|
| `PORT` | 4000 | API listen port |
| `DATABASE_URL` | `file:./dev.db` | SQLite locally; Postgres on Render |
| `ML_SERVICE_URL` | `http://localhost:8000` | API → ML |
| `VITE_API_URL` / `VITE_ML_URL` | `http://localhost:4000` / `:8000` | web → services |
| `JWT_SECRET` | dev fallback | set a real one in production |
| `ANTHROPIC_API_KEY`, `BHASHINI_*` | unset | richer copy / real ASR when present; never required |

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `pnpm dev` port clash | Change ports: web `--port`, api `PORT=`, ml `--port` (+ matching `VITE_*` / `ML_SERVICE_URL`) |
| ML `pip install` fails | Use Python 3.11 venv: `py -3.11 -m venv .venv; .venv\Scripts\activate` then reinstall |
| `db:push` complains about `DATABASE_URL` | Set `$env:DATABASE_URL = "file:./dev.db"` first (PowerShell) |
| Camera/mic blocked on phone | Serve over HTTPS (Codespaces forwarded URL) — browsers gate media + SW install on secure contexts |
| Transformers model download slow | First ML use downloads BiRefNet/Whisper once, then caches in IndexedDB; server `/segment` is the automatic fallback |
| Stale PWA after code change | App shows “नया अपडेट तैयार है” toast → Reload (no silent reloads mid-flow) |
