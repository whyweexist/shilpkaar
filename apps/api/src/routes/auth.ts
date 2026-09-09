import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { phoneSchema } from "@shilpkaar/shared";
import { db } from "../db.js";

const otpStore: Record<string, { code: string; expires: number }> = {};
const DEV_CODE = "123456";

const requestSchema = z.object({ phone: phoneSchema });
const verifySchema = z.object({ phone: phoneSchema, code: z.string().length(6) });

export function registerAuthRoutes(app: FastifyInstance): void {
  app.post("/api/auth/otp/request", async (req, reply) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        code: "BAD_PHONE",
        message: "Invalid phone",
        messageHi: "गलत फ़ोन नंबर",
        retryable: false,
      });
    }
    const { phone } = parsed.data;
    // dev OTP is always 123456, clearly logged
    otpStore[phone] = { code: DEV_CODE, expires: Date.now() + 10 * 60_000 };
    req.log.warn(`[OTP] dev code for ${phone}: ${DEV_CODE}`);
    reply.send({
      sent: true,
      devHint: process.env.NODE_ENV === "production" ? undefined : DEV_CODE,
    });
  });

  app.post("/api/auth/otp/verify", async (req, reply) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        code: "BAD_INPUT",
        message: "Invalid input",
        messageHi: "गलत जानकारी",
        retryable: false,
      });
    }
    const { phone, code } = parsed.data;
    const entry = otpStore[phone];
    if (!entry || entry.code !== code || entry.expires < Date.now()) {
      return reply.code(400).send({
        code: "OTP_INVALID",
        message: "Invalid or expired OTP",
        messageHi: "ओटीपी गलत या समाप्त",
        retryable: true,
      });
    }
    delete otpStore[phone];
    const token = app.jwt.sign({ phone, artisanId: "rajesh-001" });
    reply.send({ token, artisan: db.getArtisan() });
  });

  // dev shortcut: login as seeded artisan without OTP
  app.post("/api/auth/dev-login", async (_req, reply) => {
    const token = app.jwt.sign({ phone: artisanPhone, artisanId: "rajesh-001" });
    reply.send({ token, artisan: db.getArtisan() });
  });

  // authenticated /me
  app.get("/api/me", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      // dev fallback: return seeded artisan so app boots offline-first
      return reply.send({ artisan: db.getArtisan(), dev: true });
    }
    reply.send({ artisan: db.getArtisan() });
  });

  app.patch("/api/me", async (req, reply) => {
    const patch = z
      .object({
        language: z.string().optional(),
        name: z.string().optional(),
        upiId: z.string().optional(),
        dayWage: z.number().optional(),
      })
      .parse(req.body ?? {});
    const a = db.getArtisan();
    Object.assign(a, patch);
    reply.send({ artisan: a });
  });
}

const artisanPhone = "9876543210";
