import { buildApp } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
const app = await buildApp();
await app.listen({ port, host: "0.0.0.0" });
app.log.warn(`[api] listening on http://0.0.0.0:${port}`);
