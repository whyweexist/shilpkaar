import { useEffect, useState } from "react";
import { localInsights } from "../lib/repo";
import { speak } from "../ml/tts";
import { Volume2 } from "lucide-react";

export function Insights() {
  const [data, setData] = useState<Awaited<ReturnType<typeof localInsights>> | null>(null);
  const [showOndc, setShowOndc] = useState(false);

  useEffect(() => {
    void localInsights().then((d) => {
      setData(d);
      speak(`इस महीने की कुल कमाई ${d.totalEarnings} रुपये। ${d.totalOrders} ऑर्डर मिले।`);
    });
    if (sessionStorage.getItem("sh_show_ondc") === "1") {
      setShowOndc(true);
      sessionStorage.removeItem("sh_show_ondc");
    }
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span
          className="h-8 w-8 animate-spin rounded-full border-[3px]"
          style={{ borderColor: "var(--clr-border)", borderTopColor: "var(--clr-terracotta)" }}
        />
      </div>
    );
  }

  const max = Math.max(...data.months.map((m) => m.amount), 1);
  const ondcRaw = sessionStorage.getItem("sh_last_ondc");
  const gemCsvText = sessionStorage.getItem("sh_last_gem");

  return (
    <div className="pb-[calc(var(--nav-h)+24px+env(safe-area-inset-bottom))]">
      <div className="px-[18px] pt-[calc(env(safe-area-inset-top)+16px)]">
        <h1 className="text-[22px] font-bold" style={{ color: "var(--clr-ink)" }}>
          कमाई की जानकारी
        </h1>
      </div>

      <div
        className="mx-[18px] mt-4 rounded-[20px] bg-white p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] font-semibold" style={{ color: "var(--clr-ink-soft)" }}>
              कुल कमाई
            </div>
            <div className="text-[32px] font-bold" style={{ color: "var(--clr-ink)" }}>
              ₹{data.totalEarnings.toLocaleString("en-IN")}
            </div>
            <div className="text-[13px] font-semibold" style={{ color: "var(--clr-success)" }}>
              ↑ ₹{data.todayDelta.toLocaleString("en-IN")} आज
            </div>
          </div>
          <button
            onClick={() =>
              speak(`कुल कमाई ${data.totalEarnings} रुपये। आज ${data.todayDelta} जुड़े।`)
            }
            className="focus-ring flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full"
            style={{ background: "var(--clr-cream-2)" }}
            aria-label="Speak earnings"
          >
            <Volume2 size={20} style={{ color: "var(--clr-terracotta)" }} />
          </button>
        </div>
        <div className="mt-4 flex h-28 items-end gap-2">
          {data.months.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-[6px]"
                style={{
                  height: `${(m.amount / max) * 90}px`,
                  background: "var(--clr-terracotta)",
                  opacity: 0.85,
                }}
              />
              <span className="text-[10px]" style={{ color: "var(--clr-ink-soft)" }}>
                {m.month}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="mx-[18px] mt-3 rounded-[20px] bg-white p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-[15px] font-bold" style={{ color: "var(--clr-ink)" }}>
          फ़नल
        </h2>
        <div
          className="mt-3 flex items-center justify-between text-[13px]"
          style={{ color: "var(--clr-ink)" }}
        >
          <span>देखे {data.funnel.views}</span>
          <span>→</span>
          <span>कार्ट {data.funnel.carts}</span>
          <span>→</span>
          <span>ऑर्डर {data.funnel.orders}</span>
        </div>
        {data.bestProduct && (
          <div
            className="mt-3 rounded-[12px] px-3 py-2 text-[13px]"
            style={{ background: "var(--clr-cream-2)", color: "var(--clr-ink)" }}
          >
            सबसे लोकप्रिय: <b>{data.bestProduct.titleHi}</b> ({data.bestProduct.views} views)
          </div>
        )}
      </div>

      <div
        className="mx-[18px] mt-3 rounded-[20px] bg-white p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-[15px] font-bold" style={{ color: "var(--clr-ink)" }}>
          कीमत सलाह
        </h2>
        <p className="mt-1 text-[13px]" style={{ color: "var(--clr-ink)" }}>
          Terracotta Lamp पर 12% बढ़ोतरी करें — मांग ऊँची है
        </p>
        <button
          onClick={() => {
            const rows = [
              ["Month", "Amount (INR)"],
              ...data.months.map((m) => [m.month, String(m.amount)]),
            ];
            const csv = rows.map((r) => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "shilpkaar-cashflow.csv";
            a.click();
          }}
          className="focus-ring mt-3 flex min-h-[48px] w-full items-center justify-center rounded-[12px] text-[13px] font-bold text-white"
          style={{ background: "var(--clr-maroon-800)" }}
        >
          बैंक के लिए कैशफ़्लो स्टेटमेंट (CSV) डाउनलोड
        </button>
      </div>

      {showOndc && ondcRaw && (
        <div
          className="mx-[18px] mt-3 rounded-[20px] bg-white p-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-[15px] font-bold" style={{ color: "var(--clr-ink)" }}>
            ONDC पेलोड{" "}
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ background: "var(--clr-warn)" }}
            >
              MOCK
            </span>
          </h2>
          <pre
            className="mt-2 max-h-52 overflow-auto rounded-[8px] p-2 text-[10px]"
            style={{ background: "var(--clr-cream-2)" }}
          >
            {JSON.stringify(JSON.parse(ondcRaw).payload, null, 2)}
          </pre>
          <p
            className="mt-1 text-[11px]"
            style={{
              color: JSON.parse(ondcRaw).valid ? "var(--clr-success)" : "var(--clr-danger)",
            }}
          >
            बेकन on_search सत्यापन:{" "}
            {JSON.parse(ondcRaw).valid ? "✓ मान्य" : `✗ ${JSON.parse(ondcRaw).errors.join(", ")}`}
          </p>
          {gemCsvText && (
            <button
              onClick={() => {
                const blob = new Blob([gemCsvText], { type: "text/csv" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "gem-bulk-upload.csv";
                a.click();
              }}
              className="focus-ring mt-2 flex min-h-[48px] w-full items-center justify-center rounded-[12px] text-[13px] font-bold text-white"
              style={{ background: "var(--clr-maroon-800)" }}
            >
              GeM CSV डाउनलोड
            </button>
          )}
        </div>
      )}
    </div>
  );
}
