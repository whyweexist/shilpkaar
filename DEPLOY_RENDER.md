# Deploying Shilpkaar on Render

This repo ships a Render Blueprint (`render.yaml`) that provisions **4 resources**: Node API, Python ML service, static web frontend, and a Postgres database. Follow these steps top to bottom.

## What gets created

| Resource | Name | Plan | Notes |
|---|---|---|---|
| Web service (Node 20) | `shilpkaar-api` | free | Fastify API, health check `/health` |
| Web service (Python 3.11) | `shilpkaar-ml` | free | FastAPI + LightGBM/onnxruntime CPU, health check `/health` |
| Static site | `shilpkaar-web` | free | `apps/web/dist`, SPA fallback to `/index.html`, `/s/*` rewrites proxied to the API |
| Postgres | `shilpkaar-db` | free | Provisioned by the blueprint; the current API serves its deterministic in-memory seed store, so **no migration step is required** (see §6) |

## Prerequisites

1. A [Render](https://render.com) account (free tier is enough).
2. This code pushed to GitHub — **the local folder is not a git repo yet**, so:
   ```powershell
   cd E:\sh
   git init; git add -A; git commit -m "Shilpkaar production build"
   gh repo create shilpkaar --public --source=. --push
   ```
   (or create the repo on github.com and `git remote add origin <url>; git push -u origin main`. Use branch `main`.)

## Deployment steps (Blueprint — recommended)

1. Render Dashboard → **New + → Blueprint** → connect the GitHub repo.
2. Render reads `render.yaml` and shows the 4 resources. Confirm:
   - `DATABASE_URL` (api) ← from `shilpkaar-db` — auto-wired.
   - `JWT_SECRET` (api) — auto-generated.
   - `ML_SERVICE_URL` (api) ← host of `shilpkaar-ml` — auto-wired. (The API code now prepends `https://` to bare hostnames, so this works as-is.)
   - `VITE_API_URL` / `VITE_ML_URL` (web) — baked into the JS bundle at build time; defaults assume the service names above (`https://shilpkaar-api.onrender.com`, `https://shilpkaar-ml.onrender.com`).
3. Click **Apply**. Build order is automatic; first deploy takes ~5–10 min (pip install + pnpm install).
4. Wait until all three services are **Live** (green), then verify (§4).

> **If you rename any service**, update these three places to match: the two `VITE_*` values and the two `/s/*` rewrite destinations in `render.yaml` (they hardcode `https://shilpkaar-api.onrender.com`).

## Verification checklist

```powershell
$api = "https://shilpkaar-api.onrender.com"
$ml  = "https://shilpkaar-ml.onrender.com"

Invoke-RestMethod "$api/health"                                  # { ok: true, service: shilpkaar-api }
Invoke-RestMethod "$ml/health"                                   # { ok: true, service: shilpkaar-ml }
(Invoke-RestMethod "$api/api/products").products.Count           # 12
(Invoke-RestMethod "$api/api/orders").orders.Count               # 24
```

Then in a browser: open the `shilpkaar-web` URL (`https://shilpkaar-web.onrender.com` or your custom domain), confirm the Home screen loads seeded data, run through the listing flow, and open a microstore page: `<api-url>/s/rajesh-kumar/terracotta-lamp`.

## Free-tier realities (already handled in code)

- **Cold starts (~30–60 s after idle).** The web client shows “AI service waking up…” and retries with backoff (`apiPost` retries 502/503; `mlPrice` 3 attempts). Just wait and retry — don't redeploy.
- **Ephemeral disk.** Uploaded media is not persisted server-side; the demo store is deterministic and reseeds on boot. Don't treat the free API as durable storage.
- **512 MB RAM.** The ML service is CPU-only, lazy-loads models as singletons, caps uploads at 4 MB, and downscales segmentation input to 512².

## Manual (non-Blueprint) alternative

Create each resource by hand with the same build/start commands and health paths from `render.yaml`, add a Postgres instance and set `DATABASE_URL` on the API, set `ML_SERVICE_URL` to the ML service's host, and on the static site set `VITE_API_URL` / `VITE_ML_URL` to the deployed `https://…` URLs **before** its build runs (Vite embeds them at build time — changing them later requires a rebuild/redeploy of the web service).

## Known limitations on Render

1. **Postgres is provisioned but unused by request paths.** The Prisma schema is `sqlite`-flavoured for local dev; the running API serves the in-process seed store (`apps/api/src/db.ts`). Wiring Prisma to Postgres is future P5 work — do not run `db:push` against the Render database.
2. **Service renames break baked URLs.** See the note in §2 — `VITE_*` values and `/s/*` rewrites assume default subdomains.
3. **First ML `/price` call is slow** (LightGBM models load lazily on first inference, plus possible cold start). The client timeout is 8 s with retries; warm it with one request after deploy.
