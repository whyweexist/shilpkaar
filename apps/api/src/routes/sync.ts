import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db.js";

const syncSchema = z.object({
  id: z.string(),
  table: z.string(),
  op: z.string(),
  payload: z.unknown(),
  idempotencyKey: z.string(),
  createdAt: z.number(),
  attempts: z.number().optional(),
});

export function registerSyncRoutes(app: FastifyInstance): void {
  // outbox drain endpoint — idempotent per Idempotency-Key
  app.post("/api/sync", async (req, reply) => {
    const idem = (req.headers["idempotency-key"] as string | undefined) ?? "";
    if (idem && db.seenKey(idem))
      return reply.send({ synced: true, duplicate: true, remaining: 0 });
    const parsed = syncSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        code: "BAD_INPUT",
        message: "invalid sync payload",
        messageHi: "गलत डेटा",
        retryable: false,
      });
    }
    const item = parsed.data;
    if (item.table === "products" && item.op === "create") {
      const p = item.payload as { id?: string; slug?: string; titleEn?: string; titleHi?: string };
      if (p && p.slug) {
        db.markKey(idem);
        const existing = db.listProducts().find((x) => x.slug === p.slug);
        if (existing) return reply.send({ synced: true, duplicate: true, remaining: 0 });
      }
    }
    db.markKey(idem);
    reply.send({ synced: true, remaining: 0 });
  });

  // assisted mode: callback request log
  app.post("/api/help/callback", async (req, reply) => {
    const body = z
      .object({ phone: z.string().optional(), note: z.string().optional() })
      .parse(req.body ?? {});
    req.log.warn(`[HELP] callback requested: ${body.phone ?? "unknown"} — ${body.note ?? ""}`);
    reply.send({ logged: true, etaMinutes: 15 });
  });
}
