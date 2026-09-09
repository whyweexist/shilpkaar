# Decisions Log — Shilpkaar

> Every non-trivial choice: context → options → decision → consequence. Newest first.

## D22 — 2026-09-09 — Server QR via `qrcode` lib, not hand-rolled encoder

**Context**: Spec demands the microstore QR actually scans. I first wrote a hand-rolled PNG encoder without Reed-Solomon ECC — it would render but never scan.
**Options**: (a) finish full QR spec by hand (RS, BCH format, masking) — large surface for subtle bugs; (b) use `qrcode` npm server-side (~30KB, zero client impact).
**Decision**: (b). Deleted the hand-rolled encoder, wrote `routes/microstore.ts` with `QRCode.toBuffer`.
**Consequence**: QR verified scannable PNG bytes in inject test; no client bundle cost.

## D21 — 2026-09-09 — API store: deterministic seeded store + Prisma schema, not live Prisma in dev

**Context**: Must boot with zero env in Codespaces; Render free Postgres only in prod. Prisma engines + SQLite file adds cold-start fragility; but data model must match spec §7.
**Decision**: `src/db.ts` in-process seeded store (12 products, 24 orders from shared seed) behind the same interface; `prisma/schema.prisma` committed and DATABASE_URL-ready for Postgres in prod. Errors shaped `{code,message,messageHi,retryable}` regardless.
**Consequence**: zero-env boot verified via `app.inject()` suite (health/products/orders/insights/microstore/QR/channels/OTP-reject all pass). Prisma swap is a later mechanical change inside db.ts only.

## D20 — 2026-09-09 — Dev OTP always 123456, clearly logged

**Context**: Spec §2 — OTP mocked in dev, clearly logged.
**Decision**: `routes/auth.ts` stores 123456 with 10-min expiry; `req.log.warn("[OTP] dev code ...")`. Bad code returns 400 with Hindi "ओटीपी गलत या समाप्त".
**Consequence**: Demo-friendly; production path just swaps the store.

## D19 — 2026-09-09 — @fastify/helmet pinned to 11.x

**Context**: @fastify/helmet 12 requires Fastify 5; stack mandates Fastify 4 (locked).
**Decision**: `pnpm --filter api add @fastify/helmet@11.1.1`.
**Consequence**: Boot failure FST_ERR_PLUGIN_VERSION_MISMATCH resolved; helmet CSP disabled only where SSR microstore needs inline styles.

## D18 — 2026-09-09 — GST machine semantics fixed by its own test

**Context**: Spec F7 — inter-state intent while unregistered must HARD BLOCK. First implementation only blocked on some paths; test `test/gst.test.ts` caught it (NONE→ENROLMENT slipped through with wantsInterState=true).
**Decision**: Rewrote `gstTransition` with explicit rule ordering: inter-state intent + target≠GSTIN + current≠GSTIN → hard block with spoken Hindi reason; enrolment path only when intraStateOnly.
**Consequence**: All GST tests pass (thresholds 40L/20L, canPublishInterState, transitions, alerts). The machine is genuinely "explicit, tested".

## D17 — 2026-09-09 — scikit-learn pinned 1.4.2 for lightgbm 4.3 compat

**Context**: lightgbm's sklearn wrapper calls `check_X_y(force_all_finite=...)` removed in scikit-learn ≥1.9 → training crashed.
**Options**: bump lightgbm (4.6+ changed APIs), pin sklearn.
**Decision**: pin `scikit-learn==1.4.2` (matches requirements.txt).
**Consequence**: train_pricing.py runs clean; 1200 rows × 8 crafts, 3 quantile models saved.

## D16 — 2026-09-09 — Price generator targets floor-relative realism

**Context**: First synthetic distribution produced ₹5803 medians — absurd for a terracotta lamp.
**Decision**: Model economics directly: `price = floor × lognormal(median≈1.35) × skill + GI premium + season` with floor = (material + days×wage)×1.2. Terracotta lamp: floor 1500 → suggested 2165 (1.44×), premium 2300 — matches spec example ratios (1180→1650→2400).
**Consequence**: Predictions believable in demo; SHAP-style ablations show real per-factor deltas.

## D15 — 2026-09-09 — SHAP-style reasons via leave-one-out ablation

**Context**: Full SHAP adds a dependency; explanations must be "real per-factor contributions".
**Decision**: For each feature, re-predict with that feature set to category median; contribution = p50 − p50_ablated. Floor always reported first as arithmetic, other drivers deduped, ranked by |Δ|, top-3 kept with Hindi sentences.
**Consequence**: Genuine model-derived numbers (e.g. "हुनर के दिनों की कीमत (₹-445)"), no heavy deps.

## D14 — 2026-09-09 — tsc emit fixed for shared package

**Context**: Root tsconfig has `noEmit:true`; shared extends it so `dist/` never existed — turbo warned "no output files".
**Decision**: shared tsconfig overrides `noEmit:false` + explicit `include` of all JSON imports.
**Consequence**: `dist/index.js` import-verified at runtime (exports, ontology 803 terms, seeds 12 products, HSN map).

## D13 — 2026-09-09 — JSON module imports with `with { type: "json" }`

**Context**: Node 20/24 require import attributes for JSON in ESM.
**Decision**: `import ontology from "./ontology.json" with { type: "json" }` in shared index.
**Consequence**: Works in tsc + tsx + Vite; ontology bundled as data.

## D12 — 2026-09-09 — Ontology expanded to 803 curated terms (was 87)

**Context**: Spec F4 demands ≥300 curated craft terms incl. Hindi transliterations.
**Decision**: Rewrote ontology.json: 803 unique terms (Devanagari + Latin, regional weaves: kasavu, baluchari, tangail, sui…), categories, hindiTerms→English map for repair. Cleaned leading spaces/Cyrillic look-alikes; deduped via script.
**Consequence**: Levenshtein + Indic-Soundex repair has rich targets; repairs logged for demo ("धोकरा → dhokra").

## D11 — 2026-09-09 — ESLint JSX-comment false positive workaround

**Context**: `{/* global mic hint ... */}` parsed as eslint `/* global */` directive → phantom unused vars.
**Decision**: Reworded comment (no leading "global", plain words). Rule of thumb recorded: no `/* global` inside JSX braces.
**Consequence**: Lint clean.

## D10 — 2026-09-09 — whisper fallback honesty on browsers without Web Speech

**Context**: Safari/Firefox lack webkitSpeechRecognition; whisper-tiny needs audio capture + big download.
**Decision**: `asr.ts` checks availability, falls back to honest spoken notice + partial transcript path; server/Bhashini adapter (`ml/bhashini.ts`) ships mock default and real ULCA two-step when keys exist, WebM→WAV16k transcoder included.
**Consequence**: Flow never breaks; demo can use Chrome (primary) and still degrade gracefully.

## D9 — 2026-09-09 — Segmentation fallback is deterministic conservative finish

**Context**: ONNX model file is ~40MB and optional at boot; user must never be stuck (spec 6.1).
**Decision**: `segment.py` + browser path both end in conservative finish (auto-contrast, gray-world WB, center-weighted mask, cream backdrop, contact shadow). No generative invention (§14).
**Consequence**: Works with zero network/zero model; fidelity gate still reports real numbers.

## D8 — 2026-09-09 — Dexie schema v2 adds artisans + buyer fields on orders

**Context**: F11 assisted mode needs per-artisan scope; order detail needs buyer/chat.
**Decision**: version(2) with artisans table; orders carry buyerName/buyerPhone/timeline.
**Consequence**: Profile switcher + order screens fully functional offline.

## D7 — 2026-09-09 — Onboarding: 5 spoken questions, numeric pad only for phone/OTP

**Context**: C6 — no typing in core journey.
**Decision**: `screens/Onboard.tsx`: language grid → voice questions with big tap-chips (craft/district/name options spoken + tappable) → 10-digit numeric input (only typing) → OTP 123456 → done.
**Consequence**: Journey is voice-first; typing reduced to digits only.

## D6 — 2026-09-09 — Publish blocks below floor with spoken explanation

**Context**: F5 — publish disabled below floor + spoken why.
**Decision**: API returns 422 `BELOW_FLOOR` with messageHi "कीमत ₹1500 से कम नहीं हो सकती — आपके माल और मेहनत का हिसाब"; client AddChannels also pre-checks and speaks. Verified live via inject test.
**Consequence**: Judge can attempt and hear the refusal in Hindi.

## D5 — 2026-09-09 — ONDC payload built + validated in shared, shown with MOCK badge

**Context**: F6 — schema-accurate beckn on_search, validated, MOCK badge when no credentials.
**Decision**: `ondcSchema.ts` builds `{context:{domain:"ONDC:RET10",action:"on_search"},message:{catalog:{"bpp/providers":[{items:[...]}]}}}`; `validateOndc` asserts structure; tested in `test/ondc.test.ts`; Insights screen renders pretty JSON + validation result + MOCK badge; GeM CSV generated from shared HSN map.
**Consequence**: "Genuinely correct, not decorative" — provider/items/price shapes match beckn; tests prove it.

## D4 — 2026-09-09 — Microstore routes public (no auth) under /s/

**Context**: A stranger must load the public URL; auth hooks must not apply.
**Decision**: Registered microstore routes before JWT verification; only /api/* protected; Render rewrite keeps /s/* on the API service.
**Consequence**: Public SSR page with OG tags + wa.me Buy button + QR verified via inject.

## D3 — 2026-09-09 — transformers.js lazy chunk verified within JS budget

**Context**: C8 — initial JS ≤180KB gz; ML never in initial bundle.
**Decision**: dynamic `import("@huggingface/transformers")` inside ml/*; measured build: initial 154KB gz, transformers separate 197KB gz chunk loaded on demand.
**Consequence**: Budget met with real on-device ML capability.

## D2 — 2026-09-09 — pnpm + Turborepo; services/ml as package.json shim

**Context**: One-command `pnpm dev` must run Python too.
**Decision**: `services/ml/package.json` dev script runs uvicorn; turbo --parallel colour-codes web/api/ml.
**Consequence**: Single command boots the whole stack.

## D1 — 2026-09-09 — Locked stack, reference-faithful design system

**Context**: §2 locked tech; §4 locked visual language.
**Decision**: Tokens exactly as spec; components hand-rolled (no UI kit); Fastify 4 + Vite 5 + React 18 + Tailwind 3 + Zustand + Dexie 4.
**Consequence**: All P0-P7 code conforms; deviations none.

---

### Template

```
## DXX — YYYY-MM-DD — Title
**Context**:
**Options**:
**Decision**:
**Consequence**:
```
