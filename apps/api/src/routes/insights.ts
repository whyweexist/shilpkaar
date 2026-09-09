import type { FastifyInstance } from "fastify";
import { db } from "../db.js";

export function registerInsightsRoutes(app: FastifyInstance): void {
  app.get("/api/insights/summary", async () => {
    const orders = db.listOrders();
    const products = db.listProducts();
    const paid = orders.filter((o) => o.status === "Paid");
    const totalEarnings = paid.reduce((s, o) => s + o.amount, 0) + 1200; // +today delta shown on Home
    const months: Array<{ month: string; amount: number }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("en-IN", { month: "short" });
      const seedAmount = 3000 + ((d.getMonth() * 17 + d.getFullYear()) % 5) * 1400;
      months.push({ month: label, amount: seedAmount });
    }
    const pendingSettlement = orders
      .filter((o) => o.settlementPending)
      .reduce((s, o) => s + o.amount, 0);
    const views = products.reduce((s, p) => s + p.views, 0);
    const carts = Math.round(views * 0.18);
    const ordersCount = orders.length;
    const best = [...products].sort((a, b) => b.views - a.views)[0];
    return {
      totalOrders: orders.length,
      totalEarnings,
      todayDelta: 1200,
      views,
      funnel: { views, carts, orders: ordersCount },
      pendingSettlement,
      earningsByMonth: months,
      bestProduct: best
        ? {
            id: best.id,
            titleHi: best.titleHi,
            titleEn: best.titleEn,
            views: best.views,
            price: best.publishedPrice || best.suggestedPrice,
          }
        : null,
      priceAdvice: "Terracotta Lamp पर 12% बढ़ोतरी करें — demand ऊँची है",
    };
  });
}
