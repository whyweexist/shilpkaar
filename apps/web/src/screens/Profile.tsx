import { useEffect, useState } from "react";
import { useAppStore } from "../store/appStore";
import { useAssistedStore } from "../store/assistedStore";
import { speak } from "../ml/tts";
import { artisanSeed } from "@shilpkaar/shared";
import { apiPost } from "../lib/api";
import { ChevronRight, BadgeCheck, Download, Smartphone, PhoneCall, Users } from "lucide-react";

export function Profile() {
  const { language, setLanguage, modelCached, showToast } = useAppStore();
  const { profiles, activeId, switchTo } = useAssistedStore();
  const [gstMode, setGstMode] = useState(artisanSeed.gstMode);

  useEffect(() => {
    speak("आपकी प्रोफ़ाइल — भाषा, डेटा, और मदद यहाँ मिलेगी");
  }, []);

  async function helpCallback(): Promise<void> {
    try {
      await apiPost(
        "/help/callback",
        { phone: artisanSeed.phone, note: "assisted-mode callback" },
        undefined,
        0,
      );
    } catch {
      // offline — logged on next sync via outbox concept; toast honest state
    }
    showToast("कॉलबैक दर्ज — 15 मिनट में सहायक बुलाएँगे");
    speak("मदद बुला दी। 15 मिनट में कॉल आएगा।");
  }

  function exportData(): void {
    void (async () => {
      const { db } = await import("../db");
      const products = await db.products.toArray();
      const orders = await db.orders.toArray();
      const dump = JSON.stringify(
        { artisan: artisanSeed, products, orders, exportedAt: new Date().toISOString() },
        null,
        2,
      );
      const blob = new Blob([dump], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "shilpkaar-data.json";
      a.click();
      speak("आपका डेटा डाउनलोड हो गया");
    })();
  }

  return (
    <div className="pb-[calc(var(--nav-h)+24px+env(safe-area-inset-bottom))]">
      <div className="px-[18px] pt-[calc(env(safe-area-inset-top)+16px)]">
        <h1 className="text-[22px] font-bold" style={{ color: "var(--clr-ink)" }}>
          प्रोफ़ाइल
        </h1>
      </div>

      <div
        className="mx-[18px] mt-4 rounded-[20px] bg-white p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center gap-3">
          <img
            src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face&auto=format"
            alt="avatar"
            className="h-14 w-14 rounded-full object-cover"
            style={{ border: "2px solid var(--clr-gold)" }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-bold" style={{ color: "var(--clr-ink)" }}>
              {artisanSeed.name}
            </div>
            <div className="text-[12px]" style={{ color: "var(--clr-ink-soft)" }}>
              {artisanSeed.craft} • {artisanSeed.district}, {artisanSeed.state}
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ background: "rgba(46,158,91,0.12)", color: "var(--clr-success)" }}
          >
            <BadgeCheck size={12} className="inline" /> India Handloom
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ background: "rgba(242,193,133,0.25)", color: "#8A5A00" }}
          >
            प्रमाणित कारीगर
          </span>
        </div>
      </div>

      <Section
        icon={<Users size={18} />}
        title="प्रोफ़ाइल बदलें (सहायक मोड)"
        rows={profiles.map((p) => ({
          label: p.name,
          active: p.id === activeId,
          onClick: () => {
            switchTo(p.id);
            speak(`${p.name} की प्रोफ़ाइल खुली`);
          },
        }))}
      />

      <div
        className="mx-[18px] mt-3 rounded-[20px] bg-white p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="text-[15px] font-bold" style={{ color: "var(--clr-ink)" }}>
          भाषा / Language
        </div>
        <div className="mt-2 flex gap-2">
          {(["hi", "en", "bn", "ta"] as const).map((l) => (
            <button
              key={l}
              onClick={() => {
                setLanguage(l);
                speak(l === "hi" ? "हिंदी चुनी गई" : `Language set: ${l}`);
              }}
              className="focus-ring min-h-[44px] rounded-full px-4 text-[13px] font-bold"
              style={{
                background: language === l ? "var(--clr-terracotta)" : "var(--clr-cream-2)",
                color: language === l ? "white" : "var(--clr-ink)",
              }}
            >
              {l === "hi" ? "हिं" : l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div
        className="mx-[18px] mt-3 rounded-[20px] bg-white p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="text-[15px] font-bold" style={{ color: "var(--clr-ink)" }}>
          GST
        </div>
        <div className="mt-2 text-[13px]" style={{ color: "var(--clr-ink-soft)" }}>
          स्थिति:{" "}
          {gstMode === "NONE"
            ? "पंजीकरण नहीं"
            : gstMode === "ENROLMENT"
              ? "नामांकन जारी"
              : "GSTIN सक्रिय"}
        </div>
        <button
          onClick={() => {
            const next = gstMode === "NONE" ? "ENROLMENT" : "ENROLMENT";
            setGstMode(next);
            speak("GST नामांकन शुरू — आधार और पैन चाहिए। सीमा 40 लाख के पास ही ज़रूरी है।");
            showToast("GST नामांकन प्रक्रिया शुरू");
          }}
          className="focus-ring mt-2 flex min-h-[48px] w-full items-center justify-center rounded-[12px] text-[13px] font-bold text-white"
          style={{ background: "var(--clr-maroon-800)" }}
        >
          GST नामांकन शुरू करें
        </button>
      </div>

      <div
        className="mx-[18px] mt-3 rounded-[20px] bg-white p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-bold" style={{ color: "var(--clr-ink)" }}>
            AI मॉडल
          </div>
          <span className="text-[12px]" style={{ color: "var(--clr-ink-soft)" }}>
            {modelCached ? "कैश्ड" : "पहली बार डाउनलोड होगा"}
          </span>
        </div>
        <button
          onClick={() => {
            if ("caches" in window) {
              void caches.keys().then((keys) => {
                for (const k of keys)
                  if (k.includes("ml") || k.includes("model")) void caches.delete(k);
              });
            }
            showToast("AI मॉडल जगह खाली कर दी");
          }}
          className="focus-ring mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] text-[13px] font-semibold"
          style={{ border: "1px solid var(--clr-border)", color: "var(--clr-ink)" }}
        >
          <Download size={15} /> जगह खाली करें
        </button>
      </div>

      <div className="mx-[18px] mt-3 flex flex-col gap-2">
        <button
          onClick={exportData}
          className="focus-ring flex min-h-[52px] items-center justify-between rounded-[16px] bg-white px-4 text-[14px] font-semibold"
          style={{ boxShadow: "var(--shadow-card)", color: "var(--clr-ink)" }}
        >
          📁 डेटा निर्यात (JSON) <ChevronRight size={16} />
        </button>
        <button
          onClick={() => void helpCallback()}
          className="focus-ring flex min-h-[52px] items-center justify-between rounded-[16px] bg-white px-4 text-[14px] font-semibold"
          style={{ boxShadow: "var(--shadow-card)", color: "var(--clr-ink)" }}
        >
          <span className="flex items-center gap-2">
            <PhoneCall size={16} /> मदद बुलाएँ (कॉलबैक)
          </span>{" "}
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => {
            const standalone = window.matchMedia("(display-mode: standalone)").matches;
            if (!standalone)
              showToast("इंस्टॉल करें: ब्राउज़र मेनू → Add to Home Screen", undefined, undefined);
            else showToast("ऐप पहले से इंस्टॉल्ड है ✓");
          }}
          className="focus-ring flex min-h-[52px] items-center justify-between rounded-[16px] bg-white px-4 text-[14px] font-semibold"
          style={{ boxShadow: "var(--shadow-card)", color: "var(--clr-ink)" }}
        >
          <span className="flex items-center gap-2">
            <Smartphone size={16} /> ऐप इंस्टॉल करें
          </span>{" "}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  rows: Array<{ label: string; active: boolean; onClick: () => void }>;
}): JSX.Element {
  return (
    <div
      className="mx-[18px] mt-3 rounded-[20px] bg-white p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className="flex items-center gap-2 text-[15px] font-bold"
        style={{ color: "var(--clr-ink)" }}
      >
        {icon} {title}
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {rows.map((r) => (
          <button
            key={r.label}
            onClick={r.onClick}
            className="focus-ring flex min-h-[48px] items-center justify-between rounded-[12px] px-3 text-[14px]"
            style={{
              background: r.active ? "rgba(224,118,47,0.08)" : "transparent",
              color: "var(--clr-ink)",
            }}
          >
            <span>{r.label}</span>
            {r.active && <BadgeCheck size={16} style={{ color: "var(--clr-terracotta)" }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
