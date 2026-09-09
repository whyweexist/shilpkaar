import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db, type DexieOrder } from "../db";
import { speak, stopSpeak } from "../ml/tts";
import { apiPost } from "../lib/api";
import { ChevronLeft, Package, Truck, Home, IndianRupee } from "lucide-react";

const STEPS = [
  { key: "New", hi: "à¤¨à¤¯à¤¾ à¤‘à¤°à¥à¤¡à¤°", icon: Package },
  { key: "Pack", hi: "à¤ªà¥ˆà¤• à¤•à¤°à¥‡à¤‚", icon: Package },
  { key: "Ship", hi: "à¤­à¥‡à¤œà¥‡à¤‚", icon: Truck },
  { key: "Delivered", hi: "à¤ªà¤¹à¥à¤à¤šà¤¾", icon: Home },
  { key: "Paid", hi: "à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤®à¤¿à¤²à¤¾", icon: IndianRupee },
];

const PACK_GUIDES: Record<string, string[]> = {
  terracotta: [
    "à¤…à¤–à¤¬à¤¾à¤° à¤®à¥‡à¤‚ à¤²à¤ªà¥‡à¤Ÿà¥‡à¤‚",
    "à¤¡à¤¿à¤¬à¥à¤¬à¥‡ à¤®à¥‡à¤‚ à¤­à¤°à¤¾à¤µà¤¨ (à¤¹à¤²à¥à¤•à¤¾ à¤ªà¥‰à¤²à¤¿à¤¸à¥à¤Ÿà¤°) à¤¡à¤¾à¤²à¥‡à¤‚",
    "FRAGILE à¤¸à¥à¤Ÿà¤¿à¤•à¤° à¤²à¤—à¤¾à¤à¤‚",
  ],
  cotton: [
    "à¤ªà¥à¤²à¤¾à¤¸à¥à¤Ÿà¤¿à¤• à¤®à¥‡à¤‚ à¤¸à¥€à¤² à¤•à¤°à¥‡à¤‚",
    "à¤ªà¤¾à¤¨à¥€ à¤¸à¥‡ à¤¬à¤šà¤¾à¤à¤‚",
    "à¤•à¤ªà¤¡à¤¼à¥‡ à¤®à¥‡à¤‚ à¤²à¤ªà¥‡à¤Ÿà¥‡à¤‚",
  ],
  brass: [
    "à¤¨à¤°à¤® à¤•à¤ªà¤¡à¤¼à¥‡ à¤®à¥‡à¤‚ à¤ªà¥‰à¤²à¤¿à¤¶ à¤•à¤°à¥‡à¤‚",
    "à¤¬à¤¬à¤² à¤°à¥ˆà¤ª à¤®à¥‡à¤‚ à¤²à¤ªà¥‡à¤Ÿà¥‡à¤‚",
    "à¤–à¤°à¥‹à¤‚à¤š à¤¸à¥‡ à¤¬à¤šà¤¾à¤à¤‚",
  ],
  default: [
    "à¤¬à¤¬à¤² à¤°à¥ˆà¤ª à¤®à¥‡à¤‚ à¤²à¤ªà¥‡à¤Ÿà¥‡à¤‚",
    "à¤®à¤œà¤¼à¤¬à¥‚à¤¤ à¤¡à¤¿à¤¬à¥à¤¬à¥‡ à¤®à¥‡à¤‚ à¤°à¤–à¥‡à¤‚",
    "FRAGILE à¤¸à¥à¤Ÿà¤¿à¤•à¤° à¤²à¤—à¤¾à¤à¤‚",
  ],
};

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<DexieOrder | null>(null);
  const [chatMsg, setChatMsg] = useState("");
  const [chatReply, setChatReply] = useState("");

  useEffect(() => {
    void db.orders.get(id ?? "").then((o) => {
      setOrder(o ?? null);
      if (o) {
        speak(
          `à¤‘à¤°à¥à¤¡à¤° ${o.buyerName} à¤•à¤¾, ${o.amount} à¤°à¥à¤ªà¤¯à¥‡ à¤•à¤¾à¥¤ à¤¸à¥à¤¥à¤¿à¤¤à¤¿: ${o.status}`,
        );
        setChatMsg(
          `à¤¨à¤®à¤¸à¥à¤¤à¥‡ ${o.buyerName}! à¤†à¤ªà¤•à¤¾ à¤‘à¤°à¥à¤¡à¤° à¤¤à¥ˆà¤¯à¤¾à¤° à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆà¥¤`,
        );
        setChatReply("à¤§à¤¨à¥à¤¯à¤µà¤¾à¤¦! à¤•à¤¬ à¤®à¤¿à¤²à¥‡à¤—à¤¾?");
      }
    });
    return () => stopSpeak();
  }, [id]);

  if (!order)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p style={{ color: "var(--clr-ink-soft)" }}>à¤‘à¤°à¥à¤¡à¤° à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾</p>
      </div>
    );

  const currentIdx = STEPS.findIndex((s) => s.key === order.status);
  const guide = PACK_GUIDES.default;

  async function advance(): Promise<void> {
    const next = STEPS[Math.min(currentIdx + 1, 4)].key;
    await db.orders.update(order!.id, { status: next });
    setOrder({ ...order!, status: next });
    speak(`${STEPS[currentIdx + 1]?.hi ?? "à¤ªà¥‚à¤°à¤¾"} â€” à¤¦à¤°à¥à¤œ à¤•à¤° à¤¦à¤¿à¤¯à¤¾`);
    void apiPost(`/orders/${order!.id}/status`, { status: next }).catch(() => undefined);
  }

  function returnTriage(): void {
    speak(
      "à¤µà¤¾à¤ªà¤¸à¥€ à¤•à¤¾ à¤•à¤¾à¤°à¤£ à¤¬à¤¤à¤¾à¤à¤‚ â€” à¤°à¤‚à¤— à¤…à¤²à¤—, à¤¸à¤¾à¤‡à¤œà¤¼ à¤…à¤²à¤—, à¤¯à¤¾ à¤Ÿà¥‚à¤Ÿà¤¾ à¤¹à¥à¤†?",
    );
    setChatMsg(
      "à¤µà¤¾à¤ªà¤¸à¥€ à¤•à¤¾ à¤•à¤¾à¤°à¤£: (à¤¬à¥‹à¤²à¤•à¤° à¤¬à¤¤à¤¾à¤à¤‚ â€” à¤°à¤‚à¤— à¤…à¤²à¤— / à¤¸à¤¾à¤‡à¤œà¤¼ à¤…à¤²à¤— / à¤Ÿà¥‚à¤Ÿà¤¾)",
    );
    void apiPost(`/orders/${order!.id}/return`, { reason: "voice-captured" }).catch(
      () => undefined,
    );
  }

  return (
    <div className="pb-[calc(var(--nav-h)+24px+env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          onClick={() => navigate("/orders")}
          aria-label="Back"
          className="focus-ring min-h-[56px] min-w-[56px] text-[var(--clr-ink)]"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-bold" style={{ color: "var(--clr-ink)" }}>
          à¤‘à¤°à¥à¤¡à¤° â€” {order.buyerName}
        </h1>
      </header>

      <div
        className="mx-[18px] mt-4 rounded-[20px] bg-white p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="text-[24px] font-bold" style={{ color: "var(--clr-ink)" }}>
          â‚¹{order.amount.toLocaleString("en-IN")}
        </div>
        <div className="text-[13px]" style={{ color: "var(--clr-ink-soft)" }}>
          {order.channel} â€¢ {new Date(order.createdAt).toLocaleDateString("hi-IN")}
        </div>
        <div className="mt-4 flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i <= currentIdx;
            return (
              <div key={s.key} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{
                    background: done ? "var(--clr-success)" : "var(--clr-cream-2)",
                    color: done ? "white" : "var(--clr-ink-soft)",
                  }}
                >
                  <Icon size={16} />
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: done ? "var(--clr-ink)" : "var(--clr-ink-soft)" }}
                >
                  {s.key}
                </span>
              </div>
            );
          })}
        </div>
        {currentIdx < 4 && (
          <button
            onClick={() => void advance()}
            className="focus-ring mt-4 flex min-h-[52px] w-full items-center justify-center rounded-[14px] text-[15px] font-bold text-white"
            style={{ background: "var(--clr-terracotta)" }}
          >
            à¤…à¤—à¤²à¤¾ à¤•à¤¦à¤®: {STEPS[currentIdx + 1].hi}
          </button>
        )}
      </div>

      <div
        className="mx-[18px] mt-4 rounded-[20px] bg-white p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-[15px] font-bold" style={{ color: "var(--clr-ink)" }}>
          ðŸŽ™ï¸ à¤ªà¥ˆà¤• à¤—à¤¾à¤‡à¤¡
        </h2>
        <ol className="mt-2 space-y-2">
          {guide.map((g, i) => (
            <li
              key={i}
              className="flex items-center gap-3 text-[14px]"
              style={{ color: "var(--clr-ink)" }}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                style={{ background: "var(--clr-cream-2)", color: "var(--clr-terracotta)" }}
              >
                {i + 1}
              </span>
              ðŸ“¦ {g}
            </li>
          ))}
        </ol>
        <div
          className="mt-3 flex items-center gap-3 rounded-[12px] p-3"
          style={{ background: "var(--clr-cream-2)" }}
        >
          <img
            src={`/api/orders/${order.id}/qr`}
            alt="label QR"
            className="h-20 w-20 rounded-[8px] bg-white"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="text-[12px]" style={{ color: "var(--clr-ink)" }}>
            à¤¶à¤¿à¤ªà¤¿à¤‚à¤— à¤²à¥‡à¤¬à¤² QR â€” à¤•à¥à¤²à¤¸à¥à¤Ÿà¤° à¤ªà¤¿à¤•à¤…à¤ª
            à¤ªà¥‰à¤‡à¤‚à¤Ÿ à¤ªà¤° à¤¦à¤¿à¤–à¤¾à¤à¤‚à¥¤ à¤ªà¤¿à¤•à¤…à¤ª: à¤•à¤² à¤¸à¥à¤¬à¤¹ 10â€“12
          </div>
        </div>
      </div>

      <div
        className="mx-[18px] mt-4 rounded-[20px] bg-white p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-[15px] font-bold" style={{ color: "var(--clr-ink)" }}>
          ðŸ’¬ à¤–à¤°à¥€à¤¦à¤¾à¤° à¤¬à¤¾à¤¤à¤šà¥€à¤¤ (à¤…à¤¨à¥à¤µà¤¾à¤¦à¤¿à¤¤)
        </h2>
        <div className="mt-2 space-y-2">
          <div
            className="max-w-[80%] rounded-[12px] px-3 py-2 text-[13px]"
            style={{ background: "var(--clr-cream-2)", color: "var(--clr-ink)" }}
          >
            {chatMsg}
          </div>
          <div
            className="ml-auto max-w-[80%] rounded-[12px] px-3 py-2 text-[13px]"
            style={{ background: "var(--clr-terracotta)", color: "white" }}
          >
            {chatReply}
          </div>
        </div>
      </div>

      <div className="mx-[18px] mt-4">
        <button
          onClick={returnTriage}
          className="focus-ring flex min-h-[52px] w-full items-center justify-center rounded-[14px] text-[14px] font-semibold"
          style={{ border: "1px solid var(--clr-danger)", color: "var(--clr-danger)" }}
        >
          à¤µà¤¾à¤ªà¤¸à¥€ à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚ (à¤•à¤¾à¤°à¤£ à¤¬à¥‹à¤²à¤•à¤°)
        </button>
      </div>
    </div>
  );
}
