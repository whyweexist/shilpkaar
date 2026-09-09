import { artisanSeed, productsSeed, ordersSeed } from "@shilpkaar/shared";

// Deterministic seeded store. Serves API + microstore in dev/Codespaces with zero env.
// Production (Render) uses the same interface; Prisma is wired in P5 via DATABASE_URL when present.

export interface ApiProduct {
  id: string;
  artisanId: string;
  slug: string;
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
  keywords: string[];
  attributes: {
    technique?: string;
    material?: string;
    colour?: string;
    dimensions?: string;
    motif?: string;
    region?: string;
    care?: string;
  };
  hsnCode?: string;
  materialCost: number;
  daysOfWork: number;
  floorPrice: number;
  suggestedPrice: number;
  premiumPrice: number;
  publishedPrice: number;
  stock: number;
  status: string;
  views: number;
  imageUrl: string;
  channelStates: Array<{
    channel: string;
    status: string;
    blockers: string[];
    lastSyncedAt?: string;
  }>;
  mediaCount: number;
  updatedAt: number;
}

export interface ApiOrder {
  id: string;
  artisanId: string;
  status: "New" | "Pack" | "Ship" | "Delivered" | "Paid" | "Returned";
  amount: number;
  channel: string;
  buyerName: string;
  buyerPhone: string;
  productTitle: string;
  timeline: Array<{ status: string; at: number }>;
  settlementPending: boolean;
  createdAt: number;
}

const wage = 500;
const floor = (mat: number, days: number) => Math.round((mat + days * wage) * 1.2);

let products: ApiProduct[] = [];
let orders: ApiOrder[] = [];
const seenIdempotencyKeys = new Set<string>();

export async function seedDb(): Promise<void> {
  if (products.length > 0) return;
  products = productsSeed.map((p) => {
    const f = floor(p.materialCost, p.daysOfWork);
    return {
      id: p.id,
      artisanId: p.artisanId,
      slug: p.slug,
      titleEn: p.titleEn,
      titleHi: p.titleHi,
      descriptionEn: p.descriptionEn,
      descriptionHi: p.descriptionHi,
      keywords: p.keywords,
      attributes: {
        technique: p.keywords[0],
        material: p.keywords[1],
        colour: "natural",
        region: "Madhya Pradesh",
        care: "Handle with care",
      },
      hsnCode: "97030000",
      materialCost: p.materialCost,
      daysOfWork: p.daysOfWork,
      floorPrice: f,
      suggestedPrice: Math.round(f * 1.35),
      premiumPrice: Math.round(f * 1.9),
      publishedPrice: p.status === "Listed" ? Math.round(f * 1.35) : 0,
      stock: p.stock,
      status: p.status === "Listed" ? "LIVE" : "DRAFT",
      views: p.views,
      imageUrl: p.image,
      channelStates:
        p.status === "Listed"
          ? [
              {
                channel: "MICROSTORE",
                status: "live",
                blockers: [],
                lastSyncedAt: new Date().toISOString(),
              },
              {
                channel: "WHATSAPP",
                status: "live",
                blockers: [],
                lastSyncedAt: new Date().toISOString(),
              },
              {
                channel: "ONDC",
                status: "live",
                blockers: [],
                lastSyncedAt: new Date().toISOString(),
              },
              { channel: "GEM", status: "blocked", blockers: ["GST mode required for GeM"] },
            ]
          : [{ channel: "MICROSTORE", status: "eligible", blockers: [] }],
      mediaCount: p.status === "Listed" ? 5 : 1,
      updatedAt: Date.now() - Math.round(Math.random() * 14 * 86400000),
    };
  });
  // extra orders to reach 24 across all states
  const statuses: ApiOrder["status"][] = [
    "New",
    "New",
    "Pack",
    "Pack",
    "Ship",
    "Delivered",
    "Delivered",
    "Paid",
    "Paid",
    "Paid",
    "New",
    "Pack",
  ];
  orders = [
    ...ordersSeed.map((o) =>
      toApi(
        o as {
          id: string;
          status: string;
          amount: number;
          channel: string;
          buyerName: string;
          buyerPhone: string;
          createdAt: number;
        },
      ),
    ),
  ];
  const names = [
    "मीना देवी",
    "अरुण वर्मा",
    "कविता जोशी",
    "देवेंद्र पाटिल",
    "शालिनी राव",
    "इरफ़ान ख़ान",
    "लता मिश्रा",
    "हरीश अग्रवाल",
    "पूजा नायर",
    "जसवंत सिंह",
    "ममता सोलंकी",
    "निखिल देशपांडे",
  ];
  statuses.forEach((st, i) => {
    orders.push({
      id: `ord-x${String(i + 1).padStart(2, "0")}`,
      artisanId: "rajesh-001",
      status: st,
      amount: 600 + ((i * 370) % 1900),
      channel: ["Amazon", "Flipkart", "Meesho", "ONDC"][i % 4],
      buyerName: names[i],
      buyerPhone: `9${String(800000000 + i * 1111111).slice(0, 9)}`,
      productTitle: products[(i * 5) % products.length].titleHi,
      timeline: buildTimeline(st, Date.now() - (i + 2) * 86400000 * 3),
      settlementPending: st === "Delivered",
      createdAt: Date.now() - (i + 2) * 86400000 * 3,
    });
  });
}

function buildTimeline(status: string, start: number): Array<{ status: string; at: number }> {
  const seq = ["New", "Pack", "Ship", "Delivered", "Paid"];
  const idx = seq.indexOf(status);
  return seq
    .slice(0, Math.max(1, idx + 1))
    .map((s, i) => ({ status: s, at: start + i * 86400000 }));
}

function toApi(o: {
  id: string;
  status: string;
  amount: number;
  channel: string;
  buyerName: string;
  buyerPhone: string;
  createdAt: number;
}): ApiOrder {
  const st = (
    ["New", "Pack", "Ship", "Delivered", "Paid"].includes(o.status) ? o.status : "New"
  ) as ApiOrder["status"];
  return {
    id: o.id,
    artisanId: "rajesh-001",
    status: st,
    amount: o.amount,
    channel: o.channel,
    buyerName: o.buyerName,
    buyerPhone: o.buyerPhone,
    productTitle: products[0]?.titleHi ?? "उत्पाद",
    timeline: buildTimeline(st, o.createdAt),
    settlementPending: st === "Delivered",
    createdAt: o.createdAt,
  };
}

export const db = {
  getArtisan: () => ({
    ...artisanSeed,
    verifiedVia: "handloom",
    upiId: "rajesh@upi",
    clusterId: "bhopal-cluster-1",
  }),
  listProducts: (): ApiProduct[] => products,
  getProduct: (id: string): ApiProduct | undefined => products.find((p) => p.id === id),
  getProductBySlug: (artisanSlug: string, productSlug: string): ApiProduct | undefined =>
    products.find((p) => p.slug === productSlug && artisanSlug === "rajesh-kumar"),
  createProduct: (p: ApiProduct, idem?: string): { product: ApiProduct; duplicate: boolean } => {
    if (idem && seenIdempotencyKeys.has(idem))
      return { product: products.find((x) => x.slug === p.slug) ?? p, duplicate: true };
    if (idem) seenIdempotencyKeys.add(idem);
    products.unshift(p);
    return { product: p, duplicate: false };
  },
  updateProduct: (id: string, patch: Partial<ApiProduct>): ApiProduct | undefined => {
    const p = products.find((x) => x.id === id);
    if (!p) return undefined;
    Object.assign(p, patch);
    return p;
  },
  listOrders: (): ApiOrder[] => orders,
  getOrder: (id: string): ApiOrder | undefined => orders.find((o) => o.id === id),
  updateOrder: (id: string, status: string): ApiOrder | undefined => {
    const o = orders.find((x) => x.id === id);
    if (!o) return undefined;
    o.status = status as ApiOrder["status"];
    o.timeline.push({ status, at: Date.now() });
    if (status === "Paid") o.settlementPending = false;
    return o;
  },
  seenKey: (k: string) => seenIdempotencyKeys.has(k),
  markKey: (k: string) => seenIdempotencyKeys.add(k),
};
