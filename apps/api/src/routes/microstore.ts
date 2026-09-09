import type { FastifyInstance } from "fastify";
import QRCode from "qrcode";
import { db } from "../db.js";

export function registerMicrostoreRoutes(app: FastifyInstance): void {
  app.get("/s/:artisanSlug/:productSlug", async (req, reply) => {
    const { artisanSlug, productSlug } = req.params as { artisanSlug: string; productSlug: string };
    const p = db.getProductBySlug(artisanSlug, productSlug);
    if (!p)
      return reply.code(404).type("text/html; charset=utf-8").send("<h1>उत्पाद नहीं मिला</h1>");
    const origin = `${req.protocol}://${req.headers.host ?? "localhost"}`;
    const pageUrl = `${origin}/s/${artisanSlug}/${productSlug}`;
    const price = p.publishedPrice || p.suggestedPrice;
    const html = `<!doctype html><html lang="hi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${p.titleHi} — ${p.titleEn}</title>
<meta property="og:title" content="${p.titleHi} (₹${price})">
<meta property="og:description" content="${p.descriptionHi}">
<meta property="og:image" content="${p.imageUrl.startsWith("http") ? p.imageUrl : origin + p.imageUrl}">
<meta property="og:type" content="product">
<meta property="og:url" content="${pageUrl}">
<link rel="icon" href="/icons/icon-192.png">
</head><body style="margin:0;font-family:system-ui,sans-serif;background:#FAF3E9;color:#3A2318">
<div style="max-width:430px;margin:16px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(74,17,8,.08)">
<img src="${p.imageUrl.startsWith("http") ? p.imageUrl : origin + p.imageUrl}" alt="${p.titleHi}" style="width:100%;aspect-ratio:1;object-fit:cover" loading="lazy">
<div style="padding:18px">
<div style="font-size:11px;color:#7C6152">कारीगर: राजेश कुमार • Bhopal, Madhya Pradesh</div>
<h1 style="font-size:22px;margin:8px 0 4px">${p.titleHi}</h1>
<h2 style="font-size:15px;color:#7C6152;font-weight:500;margin:0 0 12px">${p.titleEn}</h2>
<div style="font-size:24px;font-weight:700">₹${price}</div>
<p style="font-size:14px;line-height:1.6">${p.descriptionHi}</p>
<p style="font-size:13px;color:#7C6152">${p.keywords.join(" • ")}</p>
<a href="https://wa.me/919876543210?text=${encodeURIComponent(`नमस्ते! मुझे "${p.titleHi}" (₹${price}) खरीदना है।`)}" style="display:block;text-align:center;background:#2E9E5B;color:#fff;text-decoration:none;padding:14px;border-radius:12px;font-weight:700;font-size:15px">WhatsApp पर खरीदें</a>
<div style="margin-top:14px;text-align:center"><img src="${pageUrl}/qr" alt="QR" style="width:140px;height:140px" loading="lazy"><div style="font-size:11px;color:#7C6152">QR स्कैन करें</div></div>
</div></div></body></html>`;
    reply.type("text/html; charset=utf-8").send(html);
  });

  app.get("/s/:artisanSlug/:productSlug/qr", async (req, reply) => {
    const { artisanSlug, productSlug } = req.params as { artisanSlug: string; productSlug: string };
    const origin = `${req.protocol}://${req.headers.host ?? "localhost"}`;
    const url = `${origin}/s/${artisanSlug}/${productSlug}`;
    const png = await QRCode.toBuffer(url, {
      width: 300,
      margin: 2,
      color: { dark: "#4A1108", light: "#FFFFFF" },
    });
    reply.type("image/png").send(png);
  });
}
