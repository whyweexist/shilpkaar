import Dexie, { type Table } from "dexie";

export interface DexieProduct {
  id: string;
  slug: string;
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
  status: string;
  price: number;
  views: number;
  stock: number;
  imageUrl: string;
  artisanId: string;
  updatedAt: number;
  offline?: number;
}

export interface DexieMedia {
  id: string;
  productId: string;
  role: string;
  originalUrl: string;
  enhancedUrl: string;
  renditions: string;
  fidelity: string;
}

export interface OutboxItem {
  id: string;
  table: string;
  op: string;
  payload: unknown;
  idempotencyKey: string;
  createdAt: number;
  attempts: number;
}

export interface DexieOrder {
  id: string;
  status: string;
  amount: number;
  channel: string;
  buyerName: string;
  buyerPhone: string;
  timeline: string;
  createdAt: number;
}

export interface DexieArtisan {
  id: string;
  phone: string;
  name: string;
  slug: string;
  language: string;
  craft: string;
  district: string;
  state: string;
  gstMode: string;
  gstin?: string;
  enrolmentNumber?: string;
  upiId?: string;
  verifiedVia?: string;
  dayWage: number;
  products?: DexieProduct[];
}

class ShilpkaarDB extends Dexie {
  products!: Table<DexieProduct, string>;
  media!: Table<DexieMedia, string>;
  outbox!: Table<OutboxItem, string>;
  orders!: Table<DexieOrder, string>;
  artisans!: Table<DexieArtisan, string>;
  constructor() {
    super("shilpkaar");
    this.version(2).stores({
      products: "id, slug, status, artisanId, updatedAt",
      media: "id, productId",
      outbox: "id, table, createdAt, attempts",
      orders: "id, status, createdAt",
      artisans: "id, phone, slug, gstMode",
    });
  }
}

export const db = new ShilpkaarDB();

export async function enqueueOutbox(
  table: string,
  op: string,
  payload: unknown,
  idempotencyKey?: string,
): Promise<void> {
  await db.outbox.add({
    id: crypto.randomUUID(),
    table,
    op,
    payload,
    idempotencyKey: idempotencyKey || crypto.randomUUID(),
    attempts: 0,
    createdAt: Date.now(),
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("shilpkaar:outbox", { detail: { count: await db.outbox.count() } }),
    );
  }
}

export async function drainOutbox(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const items = await db.outbox.toArray();
  if (items.length === 0) return;
  const API =
    (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_API_URL ?? "";
  for (const item of items) {
    try {
      const res = await fetch(`${API}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": item.idempotencyKey },
        body: JSON.stringify(item),
      });
      if (res.ok) await db.outbox.delete(item.id);
      else if (res.status >= 400 && res.status < 500) {
        await db.outbox.delete(item.id);
      } else {
        await db.outbox.update(item.id, { attempts: item.attempts + 1 });
      }
    } catch {
      await db.outbox.update(item.id, { attempts: item.attempts + 1 });
    }
  }
}

export async function getOutboxCount(): Promise<number> {
  return db.outbox.count();
}
