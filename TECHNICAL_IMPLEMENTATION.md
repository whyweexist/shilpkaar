# Shilpkaar — Technical Implementation

Complete technical description of the whole app: architecture, every service, data flows, ML, offline system, and configuration. Operational steps live in `RUN_GUIDE.md`; Render deployment lives in `DEPLOY_RENDER.md`.

## 1. System overview

Shilpkaar is an offline-first, voice-first PWA for Indian handicraft artisans: photograph a product → describe it by voice in Hindi → get AI copy + fidelity-checked photos + LightGBM price guidance → publish to Microstore / WhatsApp / ONDC / GeM. It works in airplane mode and needs **zero API keys**.

```
┌─ apps/web (PWA, :5173) ──────────────────────────────┐
│ React 18 · Vite 5 · Tailwind · Zustand · Dexie       │
│ transformers.js on-device (WebGPU→WASM→server)       │
│ custom SW: precache · /api network-first 3s ·        │
│ images LRU-60 · ML cache-first · outbox BG-Sync      │
└──────┬───────────────────────────────┬───────────────┘
       │  VITE_API_URL (/api/*)        │  VITE_ML_URL (/segment fallback)
       ▼                               ▼
┌─ apps/api (:4000) ──────────┐  ┌─ services/ml (:8000) ────────┐
│ Fastify 4 · Zod · JWT       │  │ FastAPI · CPU-only · lazy    │
│ in-memory deterministic     │  │ singleton models (<400MB)   │
│ seed store (12 prod/24 ord) │  │ /price /comps /segment       │
│ + Prisma/sqlite for local   │  │ LightGBM quantiles .25/.50/  │
│ dev (db:push/db:seed)       │  │ .75 + kNN comps + onnxruntime│
└─────────────────────────────┘  └──────────────────────────────┘
              ▲
              │  packages/shared (single source of truth)
              │  schemas · GST machine · ONDC builder · 803-term
              │  ontology · seeds · lessons · HSN · design tokens
```

Design decisions and trade-offs are recorded in `Architecture.md` / `Decisions.md`.

## 2. Monorepo layout

```
E:\sh
├── apps\web\src\{app.tsx,main.tsx,router.tsx,sw.ts,vite-env.d.ts}
│   ├── components\  (AppHeader, BottomNav, MicButton, VoiceHeroCard, ProductCard,
│   │                 StatCard, SectionHeader, MarketplaceRow, Sheet/Toast…)
│   ├── screens\     (Onboard, Home, AddCapture/Speak/Review/Confirm/Price/Channels/Done,
│   │                 MyShop, ProductDetail, Orders, OrderDetail, Insights, Learn, Profile, Offline)
│   ├── ml\          (modelManager, segmentation, fidelity, embeddings, asr, tts, bhashini)
│   ├── db\          (Dexie schema + outbox queue + drain + sync-chip event)
│   ├── store\       (appStore, addStore [draft listing], assistedStore)
│   ├── lib\         (api client, repo, copyGen, audio, bootstrap)
│   ├── i18n\        (en/hi/bn/ta JSON + typed strings)
│   └── design\      (tokens.css mirror of packages/shared tokens.ts)
├── apps\api\src\{index.ts,app.ts,db.ts}
│   ├── routes\      (auth, products, orders, insights, microstore, sync)
│   ├── services\    (mlClient with cold-start retry)
│   └── prisma\      (schema.prisma [sqlite], seed.ts [integrity gate])
├── services\ml\{app.py,pricing.py,comps.py,segment.py}
│   ├── models\      (pricing_lgbm_{25,50,75}.txt, comps_embeddings.npz, category_map.json)
│   └── train\       (train_pricing.py [1200 rows, seed 2026], build_comps.py)
└── packages\shared\src\{schemas,types,gstMachine,ondcSchema,ontology.json(803),
                         seed.ts,hon/lessons.json,hsn.json,tokens.ts}
```

Build orchestration: pnpm workspaces + Turborepo (`pnpm dev` runs web+api+ml in parallel; `build → typecheck → lint → test` gates).

## 3. Frontend — `apps/web`

**Shell & navigation.** `main.tsx` boots `app.tsx` → `router.tsx` (React Router 6 data router). `AppHeader` (maroon gradient, gold wordmark, avatar + presence dot), `GreetingBlock` (time-aware, localised), `VoiceHeroCard` (72 px glowing `MicButton`: breathing idle, AnalyserNode ripple while listening, rotating arc while processing), stat cards straddling the header boundary, `BottomNav` (Home, Products, raised Add, Insights, Profile). Every screen has a persistent mic; every generated text is read back via TTS before confirm; only the phone-number field ever requires typing (numeric pad).

**State.** Zustand slices: `appStore` (session/artisan, language, sync status, install prompt), `addStore` (multi-step listing draft: shots + fidelity + transcript + attributes + copy + price + channels), `assistedStore` (multi-artisan PIN profiles + help callbacks). Server state is cache-then-network via `lib/repo.ts` over Dexie.

**Offline-first (the core guarantee).** Dexie tables (`products`, `media`, `orders`, `outbox`, `models`, `settings`). Every mutation writes locally first, then `db/index.ts` enqueues an outbox row `{id, table, payload, idempotencyKey|crypto.randomUUID(), attempts}` and emits `shilpkaar:outbox` for the sync chip (“N items waiting”). Drain POSTs each item with an `Idempotency-Key` header; on success (or definitive 4xx) the row is deleted, else attempts increment for backoff. Triggers: service-worker Background Sync `shilpkaar-outbox` → `clients.matchAll` wake → page drains (SW never touches IndexedDB); `visibilitychange`/`online` fallback covers iOS Safari. The API dedupes by key (`seenKey/markKey`, `POST /api/products` returns `{duplicate:true}` on replay) and every error speaks `messageHi` aloud.

**Service worker** (`src/sw.ts`, own `tsconfig.sw.json` with WebWorker lib, zero `any`/suppressions). Workbox `injectManifest`: app shell precached at install; `/api/*` network-first with 3 s timeout + cache fallback; images cache-first with 60-entry LRU; `huggingface.co` + `/models/` cache-first, never expired; navigations fall back to `/offline`. Update flow: new SW → “नया अपडेट तैयार है” toast with Reload; no silent reloads.

**On-device ML** (`ml/`).
- `modelManager.ts` — lazy singleton loader, never in the initial bundle (separate ~197 KB gzip chunk); first-run screen with real MB/% progress, Wi-Fi-later + cancel; IndexedDB/Cache persistence + Profile “free up space”; backend chain WebGPU → WASM(SIMD+threads) → server `/segment`; low-end path (`deviceMemory < 3` or WASM init > 6 s) posts straight to the server.
- `segmentation.ts` — `enhanceShot(canvas)`: BiRefNet mask (RMBG-1.4 only behind `VITE_USE_RMBG=1`, non-commercial) or conservative centre-ellipse fallback → cream-plate (`#FAF3E9`) cut-out → gray-world white balance inside mask → synthesised contact-shadow ellipse → WebP export + 1:1/3:4/4:5 channel crops. Generates nothing — enhancement only.
- `fidelity.ts` — hand-rolled ΔE00 (Lab), SSIM (luminance), and **silhouette-edge IoU**: output alpha derived from the finished frame by differencing against the known cream plate (or a supplied output mask), boundary-extracted and IoU'd against the source silhouette. Gates: ΔE ≤ 3.0, SSIM ≥ 0.92, edge-IoU ≥ 0.97; failure → conservative edit + spoken reason. Strip UI: “Colour ✓ ΔE · Texture ✓ SSIM · Shape ✓ IoU”.
- `asr.ts` / `bhashini.ts` — Web Speech API (`hi-IN`/`bn-IN`/`ta-IN`/`en-IN`) primary, `Xenova/whisper-tiny` offline fallback with silent auto-switch; Bhashini behind an interface (16 kHz mono base64 WAV ULCA two-step when keys exist, mock otherwise, never blocking).
- `copyGen.ts` — ontology repair (Levenshtein + Indic-aware Soundex over 803 terms, repairs logged for demo) → attribute extraction → bilingual copy (title ≤ 80 chars, 5 bullets, description, 15–20 keywords; Anthropic path only if key set) → claim gate (hedges GI/pure-silk/organic/natural-dye unless profile-verified).
- `embeddings.ts` — `Xenova/clip-vit-base-patch32` for category detection + comparables lookup.

**i18n.** Typed `strings.ts` (hi default, en/bn/ta) + per-language JSON; language switch by long-press on the mic; onboarding is 5 spoken questions.

**Budgets.** Initial JS ≈154 KB gzipped (≤180 KB); FCP/TTI targets via code-split transformers chunk and lazy models.

## 4. Backend — `apps/api`

Fastify 4 + Zod + `@fastify/jwt/cors/helmet/rate-limit/multipart`. `index.ts` listens on `0.0.0.0:${PORT}` (Render-compatible). Every write honours `Idempotency-Key`; errors return `{code, message, messageHi, retryable}`.

| Method & path | Purpose |
|---|---|
| `GET /health`, `GET /api/health` | Liveness (Render health checks) |
| `POST /api/auth/otp/request` · `POST /api/auth/otp/verify` | Phone OTP (dev code `123456`, logged); `POST /api/auth/dev-login` shortcut |
| `GET/PATCH /api/me` | Artisan profile |
| `GET /api/products` · `GET /api/products/:id` | List (12 seeded) / detail |
| `POST /api/products` | Zod-validated create (bilingual titles ≤80ch, 5–20 keywords, costs) + idempotency dedupe; floor computed server-side |
| `PATCH /api/products/:id` | Titles/descriptions/stock/status/price |
| `POST /api/products/:id/media` | Multipart ≤4 MB image attach |
| `POST /api/products/:id/price` | Proxies ML `/price`; **honest fallback** (`floor + category median`, `fallback:true`) when ML unreachable |
| `GET /api/products/:id/channels` | Per-channel eligibility + blockers |
| `POST /api/products/:id/publish` | **422 BELOW_FLOOR** if price < floor; else per-channel live marking |
| `GET /api/orders` · `GET /api/orders/:id` | List (24) / detail |
| `POST /api/orders/:id/status` · `POST /api/orders/:id/return` | Timeline advance; voice-captured return triage feeding fidelity metrics |
| `GET /api/insights/summary` | Earnings, funnel, settlements, price advice |
| `GET /s/:artisanSlug/:productSlug` | Public microstore (SSR meta + OG, Buy-on-WhatsApp link) |
| `GET /s/:artisanSlug/:productSlug/qr` | Scannable QR PNG |
| `POST /api/sync` · `POST /api/help/callback` | Outbox drain endpoint; assisted-mode callback log |

**Store.** Request paths use the deterministic in-process store (`db.ts`): seed data mapped to priced `ApiProduct`s (floor/suggested/premium, per-channel states, media counts) + 12 static + 12 generated orders spanning all timeline states. Prisma/sqlite (`db:push`/`db:seed`, `seed.ts` integrity gate: 12 products, 24 orders, 803 terms) serves local dev; Postgres is provisioned in `render.yaml` for future P5 wiring — no migration runs in deploy.

## 5. ML service — `services/ml`

FastAPI, CPU-only, lazy singleton model loads, hard ≤400 MB / 4 MB upload caps.

- `GET /health` → `{ok, service, models_loaded:"lazy"}`.
- `POST /price` → `{floor, suggested, premium, confidence, reasons[]}`. **Floor is arithmetic, never ML.** Suggested/premium come from three LightGBM quantile regressors (α .25/.50/.75) over `[material_cost, days, technique_idx, material_idx, season_idx, gi]`, trained by `train_pricing.py` on a seeded (2026) 1,200-row synthetic dataset across 8 crafts (150 rows × terracotta/handloom/chanderi/dhokra/madhubani/blue-pottery/kantha/bandhani) with log-normal market multipliers, skill/ GI premiums, and festive/wedding uplifts. Reasons are SHAP-style leave-one-out contributions rendered as spoken Hindi sentences.
- `POST /comps` → kNN over `comps_embeddings.npz` (handmade + technique/material family, 1.5×IQR outlier removal).
- `POST /segment` → onnxruntime CPU segmentation downscaled to 512²; any ML failure → conservative auto-contrast finish (`backend:"conservative"`), never a 500 without shape.

## 6. Shared — `packages/shared`

Single source of truth imported by both web and api: Zod `schemas.ts` + `types.ts`; `gstMachine.ts` (`NONE→ENROLMENT→GSTIN`, 40L/20L-special thresholds, 85% proximity alerts, **hard block** on inter-state intent without GSTIN, unit-tested); `ondcSchema.ts` (schema-accurate beckn `on_search` catalogue + validator, tested, `MOCK` badge without credentials); `ontology.json` (803 craft terms + Hindi mappings); `seed.ts` (artisan राजेश कुमार + 12 products + 12 orders); `lessons.json` (event-triggered 40 s Sikho lessons); `hsn.json` (GeM category/HSN mapping); `tokens.ts` (design tokens mirrored in CSS).

## 7. Key end-to-end flows

**Listing (≤4 min, offline-capable):** Capture (5 guided shots, live cut-out, shot coach) → Review (fidelity strip, retake/delete) → Speak (giant mic, 40 s cap, waveform) → ontology repair + attribute/copy generation → Confirm (TTS read-back, ✅/🔁/🎤-correct) → Price (Floor-locked/Suggested/Premium + spoken क्यों?) → Channels (eligibility ✅/⚠️, one-tap voice fix, GST-gated) → बेचें/Sell → Done (share sheet, printable QR). Mutations queue in the outbox offline and drain on reconnect.

**Pricing:** client calls `POST /api/products/:id/price` → `mlClient.mlPrice` (3 attempts, cold-start backoff) → ML quantiles → cards + Hindi explanations; ML down → honest floor+median fallback; publish below floor → 422 + spoken block.

**Publishing:** one canonical record → four adapters: Microstore SSR page + QR, WhatsApp `wa.me` catalogue deep link, validated ONDC `on_search` payload, GeM bulk-upload CSV + HSN/eligibility checklist.

**Orders:** voice alert → material-aware pack guide → label QR → pickup slot → Delivered → Paid; returns captured by voice and fed back to fidelity metrics.

## 8. Data model (essentials)

`Artisan` (phone-unique, slug, language, craft/cluster/district/state, gstMode, gstin/enrolment, upiId, verifiedVia, dayWage) → `Product` (slugs, bilingual titles/descriptions/keywords, attributes JSON, provenance, hsnCode, materialCost/daysOfWork, floor/suggested/premium/published prices, stock, status DRAFT→…→LIVE/PAUSED/FAILED, views) → `Media` (role front/back/texture/scale/maker, original/enhanced URLs, renditions, fidelity JSON) + `ChannelState` (MICROSTORE/WHATSAPP/ONDC/GEM × eligible/blocked/publishing/live/failed + blockers) → `Order` (buyer, items, amount, channel, status timeline New→Pack→Ship→Delivered→Paid, settlement) + `Lesson` triggers. Prisma mirrors this in sqlite; runtime uses the typed in-memory equivalent.

## 9. Configuration

Ports — web 5173 · api 4000 (`PORT`) · ml 8000. Env (all optional locally): `DATABASE_URL=file:./dev.db`, `JWT_SECRET`, `ML_SERVICE_URL`, `VITE_API_URL`, `VITE_ML_URL`, `ANTHROPIC_API_KEY`, `BHASHINI_*`, `VITE_USE_RMBG=1`. Production: `VITE_*` bake at web build time; `ML_SERVICE_URL` arrives as a bare host and is scheme-normalised in code.

## 10. Verification

`pnpm typecheck && pnpm lint && pnpm test && pnpm build` (strict TS, no `any`, ESLint+Prettier; tests: GST machine + ONDC payload + API inject e2e: 12 products, 24 orders, insights, microstore OG + wa.me, QR PNG, eligibility, OTP rejection, below-floor 422, live ML pricing with `fallback:false`). Live smoke: `/health` on all services, product/order counts, one real `/price` call.
