import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db.js";

export function registerOrderRoutes(app: FastifyInstance): void {
  app.get("/api/orders", async () => ({ orders: db.listOrders() }));

  app.get("/api/orders/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const o = db.getOrder(id);
    if (!o)
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Order not found",
        messageHi: "ऑर्डर नहीं मिला",
        retryable: false,
      });
    reply.send({ order: o });
  });

  app.post("/api/orders/:id/status", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z
      .object({ status: z.enum(["New", "Pack", "Ship", "Delivered", "Paid", "Returned"]) })
      .parse(req.body ?? {});
    const o = db.updateOrder(id, body.status);
    if (!o)
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Order not found",
        messageHi: "ऑर्डर नहीं मिला",
        retryable: false,
      });
    reply.send({ order: o });
  });

  // returns triage — captures reason, feeds fidelity dashboard
  app.post("/api/orders/:id/return", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({ reason: z.string().min(2) }).parse(req.body ?? {});
    const o = db.updateOrder(id, "Returned");
    if (!o)
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Not found",
        messageHi: "नहीं मिला",
        retryable: false,
      });
    reply.send({ order: o, loggedReason: body.reason, feedsFidelity: true });
  });
}
