import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, type ApiProduct } from "../db.js";
import { mlPrice } from "../services/mlClient.js";

const createSchema = z.object({
  slug: z.string().min(1),
  titleEn: z.string().min(1).max(80),
  titleHi: z.string().min(1).max(80),
  descriptionEn: z.string().min(1),
  descriptionHi: z.string().min(1),
  keywords: z.array(z.string()).min(5).max(20),
  attributes: z.record(z.string()).optional(),
  materialCost: z.number().int().min(0),
  daysOfWork: z.number().min(0),
  stock: z.number().int().min(0).default(1),
  imageUrl: z.string().optional(),
  fidelity: z
    .object({
      deltaE: z.number(),
      ssim: z.number(),
      edgeIou: z.number(),
      passed: z.boolean(),
      mode: z.string(),
    })
    .optional(),
});

export function registerProductRoutes(app: FastifyInstance): void {
  app.get("/api/products", async () => ({ products: db.listProducts() }));

  app.get("/api/products/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = db.getProduct(id);
    if (!p)
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Product not found",
        messageHi: "उत्पाद नहीं मिला",
        retryable: false,
      });
    reply.send({ product: p });
  });

  app.post("/api/products", async (req, reply) => {
    const idem = req.headers["idempotency-key"] as string | undefined;
    if (idem && db.seenKey(idem)) {
      const existing = db
        .listProducts()
        .find((p) => p.slug === (req.body as { slug?: string }).slug);
      return reply.send({ product: existing ?? null, duplicate: true });
    }
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        code: "BAD_INPUT",
        message: parsed.error.issues[0]?.message ?? "invalid",
        messageHi: "गलत जानकारी",
        retryable: false,
      });
    }
    const d = parsed.data;
    const floor = Math.round((d.materialCost + d.daysOfWork * 500) * 1.2);
    const product: ApiProduct = {
      id: `p-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
      artisanId: "rajesh-001",
      slug: d.slug,
      titleEn: d.titleEn,
      titleHi: d.titleHi,
      descriptionEn: d.descriptionEn,
      descriptionHi: d.descriptionHi,
      keywords: d.keywords,
      attributes: (d.attributes as ApiProduct["attributes"]) ?? {},
      hsnCode: "97030000",
      materialCost: d.materialCost,
      daysOfWork: d.daysOfWork,
      floorPrice: floor,
      suggestedPrice: Math.round(floor * 1.35),
      premiumPrice: Math.round(floor * 1.9),
      publishedPrice: 0,
      stock: d.stock,
      status: "READY",
      views: 0,
      imageUrl: d.imageUrl ?? "/icons/icon-192.png",
      channelStates: [],
      mediaCount: 1,
      updatedAt: Date.now(),
    };
    db.markKey(idem ?? "anon");
    db.createProduct(product);
    reply.code(201).send({ product });
  });

  app.patch("/api/products/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const patch = z
      .object({
        titleEn: z.string().optional(),
        titleHi: z.string().optional(),
        descriptionEn: z.string().optional(),
        descriptionHi: z.string().optional(),
        stock: z.number().int().optional(),
        status: z.string().optional(),
        publishedPrice: z.number().int().optional(),
      })
      .parse(req.body ?? {});
    const p = db.updateProduct(id, patch);
    if (!p)
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Not found",
        messageHi: "नहीं मिला",
        retryable: false,
      });
    reply.send({ product: p });
  });

  app.post("/api/products/:id/media", async (req, reply) => {
    const { id } = req.params as { id: string };
    const product = db.getProduct(id);
    if (!product)
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Product not found",
        messageHi: "उत्पाद नहीं मिला",
        retryable: false,
      });
    const file = await req.file();
    if (!file)
      return reply.code(400).send({
        code: "NO_FILE",
        message: "No file",
        messageHi: "फ़ाइल नहीं मिली",
        retryable: false,
      });
    if (file.file.bytesRead > 4 * 1024 * 1024) {
      return reply.code(413).send({
        code: "FILE_TOO_LARGE",
        message: "File must be ≤ 4MB",
        messageHi: "फ़ाइल 4MB से छोटी होनी चाहिए",
        retryable: false,
      });
    }
    const buf = await file.toBuffer();
    const b64 = `data:${file.mimetype};base64,${buf.toString("base64")}`;
    product.mediaCount += 1;
    if (!product.imageUrl || product.imageUrl.startsWith("/")) product.imageUrl = b64;
    reply.send({ originalUrl: b64, enhancedUrl: b64, mediaCount: product.mediaCount });
  });

  app.post("/api/products/:id/price", async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = db.getProduct(id);
    const body = z
      .object({
        materialCost: z.number().optional(),
        daysOfWork: z.number().optional(),
        technique: z.string().optional(),
        material: z.string().optional(),
        region: z.string().optional(),
        season: z.string().optional(),
      })
      .parse(req.body ?? {});
    const mat = body.materialCost ?? p?.materialCost ?? 300;
    const days = body.daysOfWork ?? p?.daysOfWork ?? 2;
    try {
      const pricing = await mlPrice({
        materialCost: mat,
        daysOfWork: days,
        technique: body.technique ?? p?.attributes.technique ?? "handloom",
        material: body.material ?? p?.attributes.material ?? "cotton",
        region: body.region ?? "Madhya Pradesh",
        season: body.season ?? "neutral",
      });
      reply.send(pricing);
    } catch {
      // honest fallback: floor + category median, flagged
      const floor = Math.round((mat + days * 500) * 1.2);
      reply.send({
        floor,
        suggested: Math.round(floor * 1.35),
        premium: Math.round(floor * 1.9),
        confidence: 0.4,
        reasons: [
          {
            factor: "Raw material + labour (arithmetic floor)",
            impact_inr: floor,
            text_hi: `कच्चा माल और मेहनत का खर्च ₹${floor} है`,
          },
          {
            factor: "ML service unreachable — category median applied",
            impact_inr: Math.round(floor * 0.35),
            text_hi: "एआई सेवा बंद है, औसत कीमत लगाई गई है",
          },
        ],
        fallback: true,
      });
    }
  });

  app.get("/api/products/:id/channels", async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = db.getProduct(id);
    if (!p)
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Not found",
        messageHi: "नहीं मिला",
        retryable: false,
      });
    reply.send({ eligibility: eligibilityFor(p) });
  });

  app.post("/api/products/:id/publish", async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = db.getProduct(id);
    if (!p)
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Not found",
        messageHi: "नहीं मिला",
        retryable: false,
      });
    const body = z
      .object({ channels: z.array(z.enum(["MICROSTORE", "WHATSAPP", "ONDC", "GEM"])).min(1) })
      .parse(req.body ?? {});
    const price = req.body as { price?: number };
    if (typeof price.price === "number" && price.price < p.floorPrice) {
      return reply.code(422).send({
        code: "BELOW_FLOOR",
        message: `Price below floor ₹${p.floorPrice}`,
        messageHi: `कीमत ₹${p.floorPrice} से कम नहीं हो सकती — आपके माल और मेहनत का हिसाब`,
        retryable: false,
      });
    }
    const results = body.channels.map((ch) => {
      const elig = eligibilityFor(p).find((e) => e.channel === ch);
      if (elig && elig.blockers.length > 0)
        return { channel: ch, ok: false, reason: elig.blockers.join("; ") };
      const ext = `${ch.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
      p.channelStates = [
        ...p.channelStates.filter((c) => c.channel !== ch),
        { channel: ch, status: "live", blockers: [], lastSyncedAt: new Date().toISOString() },
      ];
      return { channel: ch, ok: true, externalId: ext };
    });
    p.status = "LIVE";
    reply.send({ results, product: p });
  });
}

export function eligibilityFor(
  p: ApiProduct,
): Array<{ channel: string; eligible: boolean; blockers: string[] }> {
  const out: Array<{ channel: string; eligible: boolean; blockers: string[] }> = [];
  out.push({
    channel: "MICROSTORE",
    eligible: p.mediaCount >= 1,
    blockers: p.mediaCount >= 1 ? [] : ["Need at least 1 photo"],
  });
  out.push({
    channel: "WHATSAPP",
    eligible: p.mediaCount >= 1,
    blockers: p.mediaCount >= 1 ? [] : ["Need at least 1 photo"],
  });
  const ondcBlockers: string[] = [];
  if (!p.hsnCode) ondcBlockers.push("HSN code missing");
  if (p.mediaCount < 3) ondcBlockers.push("Need min 3 photos");
  out.push({ channel: "ONDC", eligible: ondcBlockers.length === 0, blockers: ondcBlockers });
  const gemBlockers: string[] = [];
  if (!p.hsnCode) gemBlockers.push("HSN code missing");
  if (p.mediaCount < 3) gemBlockers.push("Need min 3 photos");
  gemBlockers.push("GeM requires GST enrolment — tap to start");
  out.push({ channel: "GEM", eligible: false, blockers: gemBlockers });
  return out;
}
