/* Custom service worker — workbox injectManifest strategy.
 * App shell precached; /api/* network-first (3s) + cache fallback;
 * images cache-first LRU-60; ML models cache-first never-expired;
 * outbox drain via Background Sync + message fallback for iOS. */

export {}; // module scope so the WorkerGlobalScope augmentation below is legal

interface ManifestEntry {
  url: string;
  revision: string | null;
}

interface SyncEventLike extends ExtendableEvent {
  readonly tag: string;
}

declare global {
  // Injected by workbox-build at bundle time (injectManifest strategy).
  interface WorkerGlobalScope {
    readonly __WB_MANIFEST: ManifestEntry[];
  }
}

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = "shilpkaar-v1";
const IMG_CACHE = "shilpkaar-img-v1";
const ML_CACHE = "shilpkaar-ml-v1";
const OFFLINE_URL = "/offline";
const API_TIMEOUT_MS = 3000;
const IMG_LRU_MAX = 60;

// Workbox injects the precache manifest into this literal — do not rename.
const precacheManifest: ManifestEntry[] = self.__WB_MANIFEST;

sw.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll([...precacheManifest.map((e) => e.url), OFFLINE_URL]),
      )
      .catch(() => undefined),
  );
  void sw.skipWaiting();
});

sw.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE && k !== IMG_CACHE && k !== ML_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => sw.clients.claim())
      .catch(() => undefined),
  );
});

function fetchWithTimeout(req: Request, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(req, { signal: ctrl.signal }).finally(() =>
    clearTimeout(timer),
  );
}

async function trimLru(cacheName: string, max: number): Promise<void> {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) {
    await cache.delete(keys[0]);
  }
}

sw.addEventListener("fetch", (event: FetchEvent) => {
  const req = event.request;
  const url = new URL(req.url);

  // ML model files — cache-first, never expired (download once)
  if (
    url.pathname.startsWith("/models/") ||
    url.hostname.includes("huggingface.co") ||
    url.hostname.includes("cdn-lfs.huggingface.co")
  ) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            const clone = res.clone();
            void caches.open(ML_CACHE).then((c) => c.put(req, clone));
            return res;
          }),
      ),
    );
    return;
  }

  // Images — cache-first with 60-entry LRU
  if (req.destination === "image") {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            const clone = res.clone();
            void caches
              .open(IMG_CACHE)
              .then((c) => c.put(req, clone))
              .then(() => trimLru(IMG_CACHE, IMG_LRU_MAX));
            return res;
          }),
      ),
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetchWithTimeout(req.clone(), API_TIMEOUT_MS)
        .then((res) => {
          const clone = res.clone();
          void caches.open(CACHE).then((c) => c.put(req.clone(), clone));
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then(
              (r) => r ?? Response.json({ error: "offline" }, { status: 503 }),
            ),
        ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then(
            (r) =>
              r ??
              caches
                .match("/index.html")
                .then((f) => f ?? new Response("offline", { status: 503 })),
          ),
      ),
    );
  }
});

function wakeClients(): Promise<void> {
  // The page owns IndexedDB, so the SW wakes pages and they drain the outbox.
  return sw.clients
    .matchAll({ type: "window" })
    .then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: "DRAIN_OUTBOX" });
      }
    })
    .catch(() => undefined);
}

// Background Sync — "sync" is not in TS's WebWorker lib, so register
// through a narrowly-typed bridge instead of any blanket suppression.
sw.addEventListener(
  "sync",
  ((event: SyncEventLike) => {
    if (event.tag === "shilpkaar-outbox") {
      event.waitUntil(wakeClients());
    }
  }) as EventListener,
);

sw.addEventListener("message", ((event: ExtendableMessageEvent) => {
  const data = event.data as { type?: string } | undefined;
  if (data?.type === "SKIP_WAITING") void sw.skipWaiting();
  // iOS Safari fallback: page asks the SW to wake all clients for a drain.
  if (data?.type === "DRAIN_OUTBOX") event.waitUntil(wakeClients());
}) as EventListener);
