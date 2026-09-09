import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import fastifyJwt from "@fastify/jwt";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerProductRoutes } from "./routes/products.js";
import { registerOrderRoutes } from "./routes/orders.js";
import { registerInsightsRoutes } from "./routes/insights.js";
import { registerMicrostoreRoutes } from "./routes/microstore.js";
import { registerSyncRoutes } from "./routes/sync.js";
import { seedDb, db } from "./db.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: "warn" } });

  await app.register(cors, { origin: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 100, timeWindow: 60_000 });
  await app.register(multipart, { limits: { fileSize: 4 * 1024 * 1024 } });
  await app.register(fastifyJwt, { secret: process.env.JWT_SECRET ?? "shilpkaar-dev-secret-2026" });

  app.decorate("authenticate", async function authenticate(this: FastifyInstance) {
    // wrapped below via addHook in routes
  });

  app.get("/health", async () => ({ ok: true, service: "shilpkaar-api", ts: Date.now() }));
  app.get("/api/health", async () => ({ ok: true, service: "shilpkaar-api", ts: Date.now() }));

  // public (no auth) microstore under /s/
  await registerMicrostoreRoutes(app);

  // auth + protected routes
  registerAuthRoutes(app);
  registerProductRoutes(app);
  registerOrderRoutes(app);
  registerInsightsRoutes(app);
  registerSyncRoutes(app);

  // error shape {code,message,messageHi,retryable}
  app.setErrorHandler((err, _req, reply) => {
    const status = err.statusCode ?? 500;
    const code =
      status === 429
        ? "RATE_LIMITED"
        : status === 400
          ? "BAD_REQUEST"
          : status === 401
            ? "UNAUTHORIZED"
            : "INTERNAL";
    const messageHi =
      status === 429
        ? "बहुत तेज़ कोशिश — थोड़ा रुकें"
        : status === 400
          ? "गलत जानकारी"
          : status === 401
            ? "कृपया दोबारा लॉगिन करें"
            : "सर्वर में समस्या — फिर कोशिश करें";
    reply.status(status).send({
      code,
      message: err.message,
      messageHi,
      retryable: status >= 500,
    });
  });

  // seed in-process if empty (dev/demo)
  if (process.env.NODE_ENV !== "production") {
    await seedDb().catch((e) => app.log.warn(`seed skipped: ${String(e)}`));
  }

  return app;
}

export { db };
