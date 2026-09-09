import { useEffect, useState } from "react";
import { ShoppingBag, Coins, Link2 } from "lucide-react";
import { AppHeader } from "../components/AppHeader";
import { VoiceHeroCard } from "../components/VoiceHeroCard";
import { StatCard } from "../components/StatCard";
import { SectionHeader } from "../components/SectionHeader";
import { ProductCard } from "../components/ProductCard";
import { MarketplaceRow } from "../components/MarketplaceRow";
import { useAppStore } from "../store/appStore";
import { db, type DexieProduct } from "../db";
import { getOutboxCount } from "../db";
import { artisanSeed } from "@shilpkaar/shared";

export function Home() {
  const { online } = useAppStore();
  const [outbox, setOutbox] = useState(0);
  const [products, setProducts] = useState<DexieProduct[]>([]);
  const [orderCount, setOrderCount] = useState(24);
  const [earnings, setEarnings] = useState(12450);

  useEffect(() => {
    void db.products.toArray().then((all) => {
      setProducts(all);
    });
    void db.orders.count().then((c) => setOrderCount(c));
    void db.orders
      .toArray()
      .then((os) =>
        setEarnings(os.filter((o) => o.status === "Paid").reduce((s, o) => s + o.amount, 0) + 1200),
      );
    void getOutboxCount().then(setOutbox);
    const onOutbox = () => {
      void getOutboxCount().then(setOutbox);
    };
    window.addEventListener("shilpkaar:outbox", onOutbox);
    return () => window.removeEventListener("shilpkaar:outbox", onOutbox);
  }, []);

  const topProducts = products.slice(0, 2);

  return (
    <div className="pb-[calc(var(--nav-h)+20px+env(safe-area-inset-bottom))]">
      <AppHeader name={artisanSeed.name.split(" ")[0]} />

      <div className="mx-auto max-w-[430px] px-[18px]">
        <div className="-mt-7 grid grid-cols-3 gap-[10px]">
          <StatCard
            icon={<ShoppingBag size={16} />}
            label="Orders"
            value={String(orderCount)}
            delta="+3 today"
          />
          <StatCard
            icon={<Coins size={16} />}
            label="Earnings"
            value={`₹${earnings.toLocaleString("en-IN")}`}
            delta="+₹1,200"
          />
          <StatCard
            icon={<Link2 size={16} />}
            label="Marketplaces"
            value="3 Connected"
            footer={
              <span className="text-[11px] font-medium" style={{ color: "var(--clr-success)" }}>
                Active
              </span>
            }
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: online ? "rgba(46,158,91,0.12)" : "rgba(217,138,31,0.15)",
              color: online ? "var(--clr-success)" : "var(--clr-warn)",
              border: `1px solid ${online ? "rgba(46,158,91,0.25)" : "rgba(217,138,31,0.3)"}`,
            }}
          >
            {online
              ? outbox > 0
                ? `${outbox} items waiting to sync`
                : "Online • Synced"
              : `Offline • ${outbox > 0 ? `${outbox} items waiting to sync` : "ready"}`}
          </span>
          <span className="text-[11.5px] font-medium" style={{ color: "var(--clr-ink-soft)" }}>
            🎙️ हर स्क्रीन पर माइक
          </span>
        </div>

        <div className="mt-4">
          <VoiceHeroCard />
        </div>

        <div className="mt-6">
          <SectionHeader title="My Products" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            {topProducts.map((p) => (
              <ProductCard
                key={p.id}
                name={p.titleHi || p.titleEn}
                price={`₹${p.price.toLocaleString("en-IN")}`}
                views={p.views}
                stockLabel={p.stock === 0 ? "Out of stock" : p.stock < 5 ? "Low stock" : "In stock"}
                status={
                  p.status === "LIVE"
                    ? "Listed"
                    : p.status === "PUBLISHING"
                      ? "Publishing…"
                      : "Draft"
                }
                image={p.imageUrl}
              />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <SectionHeader title="Marketplaces" href="/profile" />
          <div className="mt-3">
            <MarketplaceRow />
          </div>
        </div>

        <p
          className="mt-8 text-center text-[11px] leading-relaxed"
          style={{ color: "var(--clr-ink-soft)" }}
        >
          Offline-first • On-device AI • Voice-first
          <br />
          बोलके लिस्ट करो — बिना टाइपिंग
        </p>
      </div>
    </div>
  );
}
