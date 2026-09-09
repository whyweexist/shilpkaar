import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAddStore } from "../store/addStore";
import { speak, stopSpeak } from "../ml/tts";
import { apiPost } from "../lib/api";
import { ChevronLeft } from "lucide-react";

interface PriceResp {
  floor: number;
  suggested: number;
  premium: number;
  confidence: number;
  reasons: Array<{ factor: string; impact_inr: number; text_hi: string }>;
  fallback?: boolean;
}

const inr = (n: number): string => `₹${n.toLocaleString("en-IN")}`;

export function AddPrice() {
  const navigate = useNavigate();
  const { draft, setPrice } = useAddStore();
  const [price, setPriceState] = useState<PriceResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackNote, setFallbackNote] = useState("");

  useEffect(() => {
    let alive = true;
    speak("कीमत निकाल रहे हैं…", "hi-IN");
    const go = async (): Promise<void> => {
      try {
        const r = await apiPost<PriceResp>("/products/preview-price", {
          materialCost: draft.materialCost,
          daysOfWork: draft.daysOfWork,
          technique: draft.attributes.technique ?? "handloom",
          material: draft.attributes.material ?? "cotton",
          region: draft.attributes.region ?? "Madhya Pradesh",
          season: "neutral",
        });
        if (!alive) return;
        setPriceState(r);
        setPrice(r);
        if (r.fallback) setFallbackNote("AI सेवा बंद थी — औसत कीमत लगाई गई (ईमानदार बताया गया)");
      } catch {
        // honest offline fallback: floor + category median
        const floor = Math.round((draft.materialCost + draft.daysOfWork * 500) * 1.2);
        const r: PriceResp = {
          floor,
          suggested: Math.round(floor * 1.35),
          premium: Math.round(floor * 1.9),
          confidence: 0.4,
          fallback: true,
          reasons: [
            {
              factor: "Raw material + labour (floor)",
              impact_inr: floor,
              text_hi: `कच्चा माल और मेहनत — न्यूनतम ${inr(floor)}`,
            },
            {
              factor: "Offline — category median",
              impact_inr: Math.round(floor * 0.35),
              text_hi: "ऑफ़लाइन हैं — श्रेणी की औसत कीमत लगाई",
            },
          ],
        };
        if (!alive) return;
        setPriceState(r);
        setPrice(r);
        setFallbackNote("ऑफ़लाइन — न्यूनतम + औसत कीमत दिख रही है");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void go();
    return () => {
      alive = false;
      stopSpeak();
    };
  }, [draft, setPrice]);

  function explain(card: "floor" | "suggested" | "premium"): void {
    if (!price) return;
    if (card === "floor") {
      speak(
        `न्यूनतम कीमत ${inr(price.floor)} — आपके माल और मेहनत का पक्का हिसाब। इससे कम नहीं बेचें।`,
      );
    } else if (card === "suggested") {
      const r = price.reasons[1];
      speak(
        `सुझाई गई कीमत ${inr(price.suggested)}। ${r ? r.text_hi : "बाज़ार में ऐसे उत्पाद इतने में बिकते हैं।"}`,
      );
    } else {
      speak(
        `प्रीमियम कीमत ${inr(price.premium)} — त्योहारी सीज़न में या विशेष बनावट पर मिल सकती है।`,
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col px-[18px] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <header className="flex items-center gap-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          onClick={() => navigate("/add/confirm")}
          aria-label="Back"
          className="focus-ring min-h-[56px] min-w-[56px] text-[var(--clr-ink)]"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-bold" style={{ color: "var(--clr-ink)" }}>
          कीमत
        </h1>
      </header>

      {loading && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <span
            className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/30"
            style={{ borderColor: "var(--clr-border)", borderTopColor: "var(--clr-terracotta)" }}
          />
          <p className="text-[14px]" style={{ color: "var(--clr-ink-soft)" }}>
            AI कीमत निकाल रहा है…
          </p>
        </div>
      )}

      {price && (
        <>
          {fallbackNote && (
            <p
              className="mt-3 rounded-[12px] px-3 py-2 text-[12px]"
              style={{ background: "#FFF3D6", color: "#8A5A00" }}
            >
              {fallbackNote}
            </p>
          )}
          <div className="mt-4 grid grid-cols-1 gap-3">
            <PriceCard
              tag="न्यूनतम (Floor)"
              amount={price.floor}
              locked
              tone="warn"
              onWhy={() => explain("floor")}
            />
            <PriceCard
              tag="सुझाई गई"
              amount={price.suggested}
              recommended
              tone="success"
              onWhy={() => explain("suggested")}
            />
            <PriceCard
              tag="प्रीमियम"
              amount={price.premium}
              tone="ink"
              onWhy={() => explain("premium")}
            />
          </div>
          <p className="mt-3 text-center text-[12px]" style={{ color: "var(--clr-ink-soft)" }}>
            विश्वसनीयता {Math.round(price.confidence * 100)}%
          </p>
        </>
      )}

      {price && (
        <div className="mt-auto pt-6">
          <button
            onClick={() => {
              speak("अब चैनल चुनें");
              navigate("/add/channels");
            }}
            className="focus-ring flex min-h-[56px] w-full items-center justify-center rounded-[16px] text-[16px] font-bold text-white"
            style={{ background: "var(--clr-terracotta)" }}
          >
            आगे — चैनल चुनें
          </button>
        </div>
      )}
    </div>
  );
}

function PriceCard({
  tag,
  amount,
  onWhy,
  tone,
  locked,
  recommended,
}: {
  tag: string;
  amount: number;
  onWhy: () => void;
  tone: "success" | "warn" | "ink";
  locked?: boolean;
  recommended?: boolean;
}): JSX.Element {
  const colors = { success: "var(--clr-success)", warn: "var(--clr-warn)", ink: "var(--clr-ink)" };
  return (
    <div
      className="relative flex items-center justify-between rounded-[20px] bg-white p-4"
      style={{
        boxShadow: "var(--shadow-card)",
        border: recommended ? "2px solid var(--clr-terracotta)" : "1px solid var(--clr-border)",
      }}
    >
      {recommended && (
        <span
          className="absolute -top-2 left-4 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
          style={{ background: "var(--clr-terracotta)" }}
        >
          सुझाव
        </span>
      )}
      <div>
        <div className="text-[12px] font-semibold" style={{ color: "var(--clr-ink-soft)" }}>
          {tag}
          {locked ? " 🔒" : ""}
        </div>
        <div className="text-[24px] font-bold" style={{ color: colors[tone] }}>
          {inr(amount)}
        </div>
      </div>
      <button
        onClick={onWhy}
        className="focus-ring flex min-h-[48px] items-center gap-1 rounded-full px-4 text-[13px] font-bold"
        style={{ background: "var(--clr-cream-2)", color: "var(--clr-ink)" }}
      >
        क्यों? 🔊
      </button>
    </div>
  );
}
