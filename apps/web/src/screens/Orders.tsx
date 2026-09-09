import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../db";
import type { DexieOrder } from "../db";
import { speak } from "../ml/tts";

const STATUS_HI: Record<string, string> = {
  New: "नया",
  Pack: "पैक",
  Ship: "भेजा",
  Delivered: "पहुँचा",
  Paid: "भुगतान",
  Returned: "वापसी",
};

export function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<DexieOrder[]>([]);

  useEffect(() => {
    void db.orders.toArray().then((all) => {
      const sorted = all.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(sorted);
      const news = sorted.filter((o) => o.status === "New");
      if (news.length > 0) {
        speak(`नया ऑर्डर मिला! ${news.length} ऑर्डर पैक करने हैं`);
      }
    });
  }, []);

  return (
    <div className="pb-[calc(var(--nav-h)+24px+env(safe-area-inset-bottom))]">
      <div className="px-[18px] pt-[calc(env(safe-area-inset-top)+16px)]">
        <h1 className="text-[22px] font-bold" style={{ color: "var(--clr-ink)" }}>
          ऑर्डर
        </h1>
      </div>
      <div className="mt-4 flex flex-col gap-2 px-[18px]">
        {orders.map((o) => (
          <button
            key={o.id}
            onClick={() => navigate(`/orders/${o.id}`)}
            className="focus-ring flex items-center justify-between rounded-[16px] bg-white px-4 py-3 text-left"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold" style={{ color: "var(--clr-ink)" }}>
                {o.buyerName}
              </div>
              <div className="text-[12px]" style={{ color: "var(--clr-ink-soft)" }}>
                {o.channel} • {new Date(o.createdAt).toLocaleDateString("hi-IN")}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[15px] font-bold" style={{ color: "var(--clr-ink)" }}>
                ₹{o.amount.toLocaleString("en-IN")}
              </div>
              <div
                className="text-[12px] font-semibold"
                style={{
                  color:
                    o.status === "Paid"
                      ? "var(--clr-success)"
                      : o.status === "New"
                        ? "var(--clr-terracotta)"
                        : "var(--clr-ink-soft)",
                }}
              >
                {STATUS_HI[o.status] ?? o.status}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
