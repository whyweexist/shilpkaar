import { z } from "zod";

export const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian phone");

export const otpRequestSchema = z.object({ phone: phoneSchema });
export const otpVerifySchema = z.object({ phone: phoneSchema, code: z.string().length(6) });

export const productCreateSchema = z.object({
  slug: z.string().min(1),
  titleEn: z.string().min(1).max(80),
  titleHi: z.string().min(1),
  descriptionEn: z.string().min(1),
  descriptionHi: z.string().min(1),
  keywords: z.array(z.string()).min(5).max(20),
  attributes: z.object({
    technique: z.string().optional(),
    material: z.string().optional(),
    colour: z.string().optional(),
    dimensions: z.string().optional(),
    motif: z.string().optional(),
    region: z.string().optional(),
    care: z.string().optional(),
  }),
  materialCost: z.number().int().min(0),
  daysOfWork: z.number().min(0),
  stock: z.number().int().min(0).default(1),
  idempotencyKey: z.string().optional(),
});

export const priceResponseSchema = z.object({
  floor: z.number(),
  suggested: z.number(),
  premium: z.number(),
  confidence: z.number(),
  reasons: z.array(
    z.object({
      factor: z.string(),
      impact_inr: z.number(),
      text_hi: z.string(),
    }),
  ),
});

export const gstTransitionSchema = z.object({
  from: z.enum(["NONE", "ENROLMENT", "GSTIN"]),
  to: z.enum(["NONE", "ENROLMENT", "GSTIN"]),
  trigger: z.string(),
});
