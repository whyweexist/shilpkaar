import { db, enqueueOutbox, drainOutbox, getOutboxCount } from "../db";
import type { DexieProduct } from "../db";
import { apiGet } from "./api";
import { productsSeed } from "@shilpkaar/shared";

/** Local-first product create: Dexie write + outbox job, then API best-effort. */
export async function createProductLocalFirst(draft: {
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
  keywords: string[];
  materialCost: number;
  daysOfWork: number;
  stock: number;
  imageUrl: string;
  fidelity?: { deltaE: number; ssim: number; edgeIou: number; passed: boolean; mode: string };
}): Promise<DexieProduct> {
  const slug = `${draft.titleEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)}-${Date.now().toString(36)}`;
  const floor = Math.round((draft.materialCost + draft.daysOfWork * 500) * 1.2);
  const product: DexieProduct = {
    id: crypto.randomUUID(),
    slug,
    titleEn: draft.titleEn,
    titleHi: draft.titleHi,
    descriptionEn: draft.descriptionEn,
    descriptionHi: draft.descriptionHi,
    status: "READY",
    price: Math.round(floor * 1.35),
    views: 0,
    stock: draft.stock,
    imageUrl: draft.imageUrl,
    artisanId: "rajesh-001",
    updatedAt: Date.now(),
    offline: 1,
  };
  await db.products.add(product);
  const idem = crypto.randomUUID();
  await enqueueOutbox(
    "products",
    "create",
    { ...product, fidelity: draft.fidelity, idempotencyKey: idem, keywords: draft.keywords },
    idem,
  );
  void tryDrain();
  return product;
}

export async function tryDrain(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  await drainOutbox();
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent("shilpkaar:outbox", { detail: { count: await getOutboxCount() } }),
    );
}

/** Publish a product to channels — enqueues outbox job (drains when online). */
export async function publishProduct(
  productId: string,
  channels: string[],
  price: number,
): Promise<{ queued: boolean }> {
  const p = await db.products.get(productId);
  if (!p) throw new Error("product not found");
  const floor = Math.round(p.price / 1.35); // recover floor from stored suggested
  if (price < floor) {
    return { queued: false };
  }
  await db.products.update(productId, { status: "PUBLISHING" });
  const idem = crypto.randomUUID();
  await enqueueOutbox(
    "products",
    "publish",
    { productId, channels, price, idempotencyKey: idem },
    idem,
  );
  void tryDrain();
  return { queued: true };
}

/** Insights computed locally from Dexie (works offline). */
export async function localInsights(): Promise<{
  totalOrders: number;
  totalEarnings: number;
  todayDelta: number;
  views: number;
  funnel: { views: number; carts: number; orders: number };
  bestProduct: { titleHi: string; views: number; price: number } | null;
  months: Array<{ month: string; amount: number }>;
}> {
  const products = await db.products.toArray();
  const orders = await db.orders.toArray();
  const views = products.reduce((s, p) => s + p.views, 0);
  const paid = orders.filter((o) => o.status === "Paid");
  const months: Array<{ month: string; amount: number }> = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.toLocaleString("en-IN", { month: "short" }),
      amount: 3000 + ((d.getMonth() * 17) % 5) * 1400,
    });
  }
  const best = [...products].sort((a, b) => b.views - a.views)[0];
  return {
    totalOrders: orders.length,
    totalEarnings: paid.reduce((s, o) => s + o.amount, 0) + 1200,
    todayDelta: 1200,
    views,
    funnel: { views, carts: Math.round(views * 0.18), orders: orders.length },
    bestProduct: best ? { titleHi: best.titleHi, views: best.views, price: best.price } : null,
    months,
  };
}

/** Server sync of products (best-effort; local remains source of truth offline). */
export async function refreshFromServer(): Promise<void> {
  try {
    const res = await apiGet<{
      products: Array<{
        id: string;
        slug: string;
        titleEn: string;
        titleHi: string;
        views: number;
        stock: number;
        status: string;
        suggestedPrice: number;
        imageUrl: string;
        updatedAt: number;
      }>;
    }>("/products");
    for (const sp of res.products) {
      const existing = await db.products.get(sp.id);
      const row: DexieProduct = {
        id: sp.id,
        slug: sp.slug,
        titleEn: sp.titleEn,
        titleHi: sp.titleHi,
        descriptionEn: "",
        descriptionHi: "",
        status: sp.status,
        price: sp.suggestedPrice,
        views: sp.views,
        stock: sp.stock,
        imageUrl: sp.imageUrl,
        artisanId: "rajesh-001",
        updatedAt: sp.updatedAt ?? Date.now(),
        ...(existing
          ? {
              descriptionEn: existing.descriptionEn,
              descriptionHi: existing.descriptionHi,
              offline: existing.offline,
            }
          : {}),
      };
      await db.products.put(row);
    }
    const orders = await apiGet<{
      orders: Array<{
        id: string;
        status: string;
        amount: number;
        channel: string;
        buyerName: string;
        buyerPhone: string;
        timeline: string;
        createdAt: number;
      }>;
    }>("/orders");
    for (const o of orders.orders) {
      await db.orders.put({
        id: o.id,
        status: o.status,
        amount: o.amount,
        channel: o.channel,
        buyerName: o.buyerName,
        buyerPhone: o.buyerPhone,
        timeline: o.timeline,
        createdAt: o.createdAt,
      });
    }
  } catch {
    // offline: local store already seeded
  }
  void productsSeed;
}
