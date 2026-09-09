import { db, type DexieProduct } from "../db";
import { productsSeed, ordersSeed, artisanSeed } from "@shilpkaar/shared";

/** Boot the local store: seed on first run so app works fully offline with seeded data. */
export async function bootstrapLocalStore(): Promise<void> {
  const count = await db.products.count();
  if (count > 0) return;
  const products: DexieProduct[] = productsSeed.map((p) => ({
    id: p.id,
    slug: p.slug,
    titleEn: p.titleEn,
    titleHi: p.titleHi,
    descriptionEn: p.descriptionEn,
    descriptionHi: p.descriptionHi,
    status: p.status === "Listed" ? "LIVE" : "DRAFT",
    price: Math.round((p.materialCost + p.daysOfWork * 500) * 1.2 * 1.35),
    views: p.views,
    stock: p.stock,
    imageUrl: p.image,
    artisanId: p.artisanId,
    updatedAt: Date.now() - Math.round(Math.random() * 10 * 86400000),
  }));
  await db.products.bulkAdd(products);
  await db.artisans.add({
    id: artisanSeed.id,
    phone: artisanSeed.phone,
    name: artisanSeed.name,
    slug: artisanSeed.slug,
    language: artisanSeed.language,
    craft: artisanSeed.craft,
    district: artisanSeed.district,
    state: artisanSeed.state,
    gstMode: artisanSeed.gstMode,
    dayWage: artisanSeed.dayWage,
  });
  for (const o of ordersSeed) {
    await db.orders.add({
      id: o.id,
      status: o.status,
      amount: o.amount,
      channel: o.channel,
      buyerName: o.buyerName,
      buyerPhone: o.buyerPhone,
      timeline: o.timeline,
      createdAt: o.createdAt,
    });
  }
}
