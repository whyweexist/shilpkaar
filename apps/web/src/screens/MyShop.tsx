import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../db";
import type { DexieProduct } from "../db";
import { SectionHeader } from "../components/SectionHeader";
import { ProductCard } from "../components/ProductCard";
import { speak } from "../ml/tts";

export function MyShop() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<DexieProduct[]>([]);
  const [filter, setFilter] = useState<"ALL" | "LIVE" | "DRAFT">("ALL");

  useEffect(() => {
    void db.products.toArray().then((all) => setProducts(all));
    speak("आपकी दुकान — सभी उत्पाद");
  }, []);

  const filtered = products.filter((p) => filter === "ALL" || p.status === filter);

  return (
    <div className="pb-[calc(var(--nav-h)+24px+env(safe-area-inset-bottom))]">
      <div className="px-[18px] pt-[calc(env(safe-area-inset-top)+16px)]">
        <h1 className="text-[22px] font-bold" style={{ color: "var(--clr-ink)" }}>
          मेरी दुकान
        </h1>
        <div className="mt-3 flex gap-2">
          {(["ALL", "LIVE", "DRAFT"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="focus-ring min-h-[44px] rounded-full px-4 text-[13px] font-semibold"
              style={{
                background: filter === f ? "var(--clr-terracotta)" : "white",
                color: filter === f ? "white" : "var(--clr-ink)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {f === "ALL" ? "सभी" : f === "LIVE" ? "लाइव" : "ड्राफ्ट"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 px-[18px]">
        <SectionHeader title={`उत्पाद (${filtered.length})`} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 px-[18px]">
        {filtered.map((p) => {
          const health = p.views === 0 ? "नया" : p.views > 10 ? "अच्छा" : "धीमा";
          return (
            <div
              key={p.id}
              onClick={() => navigate(`/products/${p.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate(`/products/${p.id}`)}
              className="focus-ring cursor-pointer"
            >
              <ProductCard
                name={p.titleHi || p.titleEn}
                price={`₹${p.price.toLocaleString("en-IN")}`}
                views={p.views}
                stockLabel={p.stock === 0 ? "Out of stock" : p.stock < 5 ? "Low stock" : "In stock"}
                status={p.status === "LIVE" ? "Listed" : "Draft"}
                image={p.imageUrl}
              />
              <div
                className="-mt-1 mb-2 text-center text-[11px]"
                style={{
                  color:
                    health === "अच्छा"
                      ? "var(--clr-success)"
                      : health === "धीमा"
                        ? "var(--clr-warn)"
                        : "var(--clr-ink-soft)",
                }}
              >
                {health === "अच्छा" ? "●" : health === "धीमा" ? "◐" : "○"} {health}
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="mt-16 text-center text-[14px]" style={{ color: "var(--clr-ink-soft)" }}>
          कोई उत्पाद नहीं — माइक दबाकर पहला बनाएं
        </p>
      )}
    </div>
  );
}
