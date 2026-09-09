# शिल्पkaar (Shilpkaar) — Artisan Business Manager

> Installable PWA. Voice-first, offline-first, on-device ML for Indian artisans.
> A judge can: open the URL on a phone → install to home screen → airplane mode → photograph a real handicraft → speak Hindi → get a published listing. Real ML, no mocks, no API keys required.

---

## Quick start (Codespaces / local)

```bash
pnpm install
python services/ml/train/train_pricing.py   # trains LightGBM pricing models (idempotent)
pnpm dev                                    # web :5173 • api :4000 • ml :8000 (parallel, colour-coded)
```

Zero environment variables needed. `.env.example` documents every optional var.

```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm test   # all pass clean
```

**Codespaces**: open the repo in a Codespace — `.devcontainer` (Node 20 + Python 3.11) runs the post-create hook automatically: `pnpm install` → `pip install -r services/ml/requirements.txt` → trains models → builds shared → runs tests. Ports 5173/4000/8000 are **public** so a phone can open the HTTPS URL (required for camera, mic, service worker).

## Render deployment

`render.yaml` blueprint: static site `shilpkaar-web` (SPA rewrite, `/s/*` kept on the API service for the SSR microstore), Node service `shilpkaar-api` (health `/health`), Python service `shilpkaar-ml` (uvicorn, health `/health`), free Postgres wired via `fromDatabase`. Free-tier handled explicitly: cold starts → client retries with backoff + "AI service waking up…" + honest fallbacks; ephemeral disk → deterministic seeded store; no GPU anywhere.

---

## Architecture

See **[Architecture.md](./Architecture.md)** for the full system diagram and internals. Summary:

```
React 18 PWA (offline shell, Dexie + outbox, on-device transformers.js v3)
   ↕ /api/* NetworkFirst-3s (SW injectManifest: precache + LRU images + ml-cache)
Fastify 4 API (JWT phone+OTP, Zod, Idempotency-Key, SSR microstore + QR, channel eligibility)
   ↕ HTTP with cold-start retry
FastAPI ML (LightGBM quantile pricing + SHAP-style reasons, onnxruntime CPU segment, kNN comps)
```

- **Offline-first (C5)**: every mutation writes Dexie first, enqueues an outbox job with an idempotency key; the custom service worker drains via Background Sync; iOS Safari fallback via `visibilitychange`/`online`. Home shows an honest sync chip: "N items waiting to sync".
- **Voice-first (C6)**: no typing in the core journey (only the 10-digit phone number); every generated text is TTS-read before confirm; every screen has a persistent mic button; 4 languages (hi/en/bn/ta).
- **No-key ML (C4)**: on-device WebGPU→WASM→server chain; deterministic fallbacks everywhere; dev OTP `123456` (clearly logged).

## Features (all working)

| #   | Feature                                                                                     | Where                                          |
| --- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| F1  | Voice listing ≤4 min, offline                                                               | `/add` → `/add/done` (elapsed shown in dev)    |
| F2  | Image studio: segmentation preview, shot coach, 5-shot set, WB+shadow+WebP crops            | `ml/segmentation.ts`                           |
| F3  | Fidelity gate ΔE00/SSIM/edge-IoU on review screen, conservative fallback + spoken why       | `ml/fidelity.ts`                               |
| F4  | ASR + 803-term ontology repair + copy gen + claim gate + TTS read-back                      | `ml/asr.ts`, `lib/copyGen.ts`                  |
| F5  | Pricing: arithmetic floor + LightGBM quantiles + spoken क्यों?; publish blocked below floor | `services/ml/pricing.py`                       |
| F6  | Microstore + QR, WhatsApp wa.me, ONDC beckn payload (validated, MOCK badge), GeM CSV        | `routes/microstore.ts`, `shared/ondcSchema.ts` |
| F7  | GST state machine (explicit, **tested**) — inter-state hard block, 40L/20L alerts           | `shared/gstMachine.ts`                         |
| F8  | Orders timeline, voice pack guide, label QR, returns triage                                 | `screens/Order*.tsx`                           |
| F9  | Insights: spoken number, monthly bars, funnel, cashflow CSV                                 | `screens/Insights.tsx`                         |
| F10 | Dexie + outbox + sync chip                                                                  | `db/index.ts`, `sw.ts`                         |
| F11 | Assisted mode: PIN profiles + call-for-help callback log                                    | `store/assistedStore.ts`                       |
| F12 | Sikho 40s voice lessons, event-triggered                                                    | `screens/Learn.tsx`, `shared/lessons.json`     |

## Environment variables

All optional — the app boots with zero env:

| Var                                     | Purpose                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| `JWT_SECRET`                            | API JWT signing (Render generates one)                                                      |
| `DATABASE_URL`                          | Postgres on Render; SQLite file locally                                                     |
| `ML_SERVICE_URL`                        | API → ML service host                                                                       |
| `VITE_API_URL` / `VITE_ML_URL`          | web → services                                                                              |
| `ANTHROPIC_API_KEY`                     | optional richer copy generation; template generator used otherwise                          |
| `BHASHINI_API_KEY` / `BHASHINI_USER_ID` | real ULCA ASR; mock adapter used otherwise                                                  |
| `VITE_USE_RMBG=1`                       | opt into RMBG-1.4 segmentation (non-commercial licence — do not enable in commercial demos) |

## Model licences & choices

- **BiRefNet_lite (onnx-community, q8)** — product dichotomous segmentation. Correct for handicrafts.
- **RMBG-1.4 (briaai)** — better quality but **non-commercial licence**; behind an env flag only.
- **⚠️ Never use Xenova/modnet here** — it is a human-portrait matting model; it will fail on a pot or a stole. Do not "optimise" back into it.
- **Xenova/clip-vit-base-patch32** — category detection / comparables lookup.
- **Xenova/whisper-tiny** — ASR fallback only when Web Speech API is unavailable.
- LightGBM models are trained by `services/ml/train/train_pricing.py` (seed 2026, 1200 rows, 8 crafts) and committed as text files.

## Performance

- Initial JS **154 KB gzipped** (budget ≤180) — transformers.js is a separate lazy 197 KB chunk loaded only on ML use.
- ML models lazy + cached (SW ml-models cache never expires; Profile shows cached state + free-up).
- 56×56 hit areas, visible focus rings, `prefers-reduced-motion` respected, only the four permitted animations.

## Testing

- `packages/shared/test/gst.test.ts` — GST state machine (thresholds, hard block, transitions, alerts).
- `packages/shared/test/ondc.test.ts` — beckn payload build + validation.
- API verified end-to-end via `app.inject()`: health, products (12), orders (24), insights, microstore OG + wa.me, scannable QR PNG, channel eligibility, OTP rejection, publish below-floor 422 block, live API→ML pricing (fallback:false).

## Known limitations

- Seed photos are hotlinked Unsplash images (royalty-free); swap to bundled assets for fully-offline first paint.
- Media storage is in-memory/base64 in the demo store; production wires S3/Cloudinary via `DATABASE_URL` Prisma path.
- App icons are real raster PNGs (192/512/maskable/180) generated in the craft palette (maroon + gold diya), safe-zone padded for maskable.
- On-device BiRefNet ONNX downloads on first ML use (progress shown); server `/segment` is the deterministic fallback.
- ONDC ships against a mock endpoint with a clearly-labelled MOCK badge (no staging credentials in the repo).

## Repository layout

```
shilpkaar/
├── .devcontainer/ .github/workflows/ci.yml  render.yaml  turbo.json  pnpm-workspace.yaml
├── Architecture.md  Decisions.md  README.md
├── apps/
│   ├── web/   (React PWA: components, screens/, ml/, db/, store/, i18n/, lib/, sw.ts)
│   └── api/   (Fastify: routes/, services/, prisma/schema.prisma)
├── services/ml/ (app.py pricing.py comps.py segment.py models/ train/)
└── packages/shared/ (schemas, types, gstMachine, ondcSchema, ontology.json, lessons.json, hsn.json, tokens, seed)
```

---

## 7-minute demo script

**(0:30)** Open the deployed URL on a phone. Tap the install card → **Add to Home Screen** → launch standalone. Point out: it's the same codebase as the website — one PWA.

**(1:00)** Turn on **airplane mode**. Show the app still works — Home loads from the service worker, the sync chip says "Offline • ready". Everything ahead happens with no network.

**(2:30)** Hand the phone to the judge with a real handicraft. Tap the big mic → **Bolke List Karo**. The camera opens with a spoken shot coach ("सामने की फोटो… रोशनी कम है — खिड़की की तरफ मुड़ें"). Capture 5 guided shots — the on-device segmentation cut-out preview appears live. Then the giant mic: they speak the description in Hindi. **No typing anywhere.**

**(3:30)** Review screen shows the fidelity strip — **Colour ✓ · Texture ✓ · Shape ✓** with the real ΔE00 / SSIM / edge-IoU numbers. Say: "Every other AI photo tool optimises for _looks better_. We optimise for _matches what arrives in the box_ — and here is the number that proves it."

**(4:30)** Three price cards — Floor 🔒 / Suggested / Premium. Tap **क्यों?** — the app explains the price aloud in Hindi, factor by factor. Try to publish below floor: it refuses and speaks why.

**(5:30)** Turn airplane mode **off**. The outbox drains — sync chip clears. The product goes live on channels. Open the public microstore URL on a laptop: SSR page, OG preview, **Buy on WhatsApp**, scan the **QR** — it resolves to the live product.

**(6:30)** Show the **ONDC beckn on_search payload** (validated ✓, MOCK badge) and download the **GeM CSV**. Close on the number: 4,186 artisans onboarded on Indiahandmade in three years, against 64.66 lakh artisans. **This is the tool that closes that gap.**
