import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAddStore } from "../store/addStore";
import { useAppStore } from "../store/appStore";
import { speak, stopSpeak } from "../ml/tts";
import { createProductLocalFirst, publishProduct } from "../lib/repo";
import { buildOndcCatalog, validateOndc, hsn } from "@shilpkaar/shared";
import { ChevronLeft, Check, AlertTriangle } from "lucide-react";

const CHANNELS = [
  { key: "MICROSTORE", name: "अपना स्टोर", desc: "public URL + QR" },
  { key: "WHATSAPP", name: "WhatsApp", desc: "कैटलॉग मैसेज" },
  { key: "ONDC", name: "ONDC", desc: "बेकन कैटलॉग (MOCK)" },
  { key: "GEM", name: "GeM", desc: "CSV — GST चाहिए" },
];

export function AddChannels() {
  const navigate = useNavigate();
  const { draft } = useAddStore();
  const { showToast } = useAppStore();
  const [publishing, setPublishing] = useState(false);
  const [eligibility, setEligibility] = useState<
    Array<{ channel: string; eligible: boolean; blockers: string[] }>
  >([]);

  useEffect(() => {
    speak("कहाँ बेचना है? सब चुन सकते हैं।");
    const mediaCount = draft.shots.length;
    const gstMode = "NONE";
    const list = CHANNELS.map((c) => {
      const blockers: string[] = [];
      if (c.key === "ONDC" && mediaCount < 3) blockers.push("कम से कम 3 फोटो चाहिए");
      if (c.key === "GEM" && gstMode === "NONE") blockers.push("GST पंजीकरण/नामांकन चाहिए");
      return { channel: c.key, eligible: blockers.length === 0, blockers };
    });
    setEligibility(list);
    return () => stopSpeak();
  }, [draft.shots.length]);

  function fix(channel: string): void {
    if (channel === "ONDC") {
      speak("फोटो जोड़ें — कम से कम तीन चाहिए। वापस कैमरे पर चलें।");
      navigate("/add");
    } else if (channel === "GEM") {
      speak("GeM के लिए GST चाहिए। प्रोफ़ाइल में नामांकन शुरू करेंगे।");
      navigate("/profile");
    }
  }

  async function sell(): Promise<void> {
    setPublishing(true);
    const price =
      draft.price.suggested ||
      Math.round((draft.materialCost + draft.daysOfWork * 500) * 1.2 * 1.35);
    const shot = draft.shots[0];
    const product = await createProductLocalFirst({
      titleEn: draft.titleEn || "Handmade Craft",
      titleHi: draft.titleHi || "हस्तनिर्मित",
      descriptionEn: draft.descriptionEn || draft.descriptionHi,
      descriptionHi: draft.descriptionHi || draft.descriptionEn,
      keywords:
        draft.keywords.length >= 5
          ? draft.keywords
          : ["handmade", "handcrafted", "indian", "artisan", "traditional"],
      materialCost: draft.materialCost,
      daysOfWork: draft.daysOfWork,
      stock: 1,
      imageUrl: shot?.dataUrl ?? "",
      fidelity: shot?.fidelity,
    });
    const allowed = eligibility.filter((e) => e.eligible).map((e) => e.channel);
    if (draft.price.floor > 0 && price < draft.price.floor) {
      speak(`न्यूनतम कीमत ${draft.price.floor} रुपये से कम नहीं बेच सकते — आपका नुकसान होगा`);
      showToast(`₹${draft.price.floor} से कम नहीं — आपके माल और मेहनत का हिसाब`);
      setPublishing(false);
      return;
    }
    if (allowed.length > 0) {
      await publishProduct(product.id, allowed, price);
    }
    // ONDC payload validation display (P5 requirement, works offline)
    const ondcPayload = buildOndcCatalog({
      id: product.id,
      titleEn: draft.titleEn,
      descriptionEn: draft.descriptionEn,
      price,
      images: [],
    });
    const validation = validateOndc(ondcPayload);
    sessionStorage.setItem(
      "sh_last_ondc",
      JSON.stringify({ payload: ondcPayload, valid: validation.valid, errors: validation.errors }),
    );
    sessionStorage.setItem("sh_last_gem", gemCsv(draft, price));
    speak(`बिक्री शुरू! ${allowed.length} जगह लाइव हो रहा है। बधाई हो!`);
    navigate("/add/done");
  }

  function gemCsv(d: typeof draft, price: number): string {
    const cat = hsn[(d.attributes.technique ?? "default") as keyof typeof hsn] ?? hsn.default;
    const rows = [
      "Category,HSN Code,Product Name,Specification,Unit Price,Quantity",
      `"${cat.gemCategory}",${cat.hsn},"${d.titleEn}","${cat.spec.join("; ")}",${price},1`,
    ];
    return rows.join("\n");
  }

  return (
    <div className="flex min-h-screen flex-col px-[18px] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <header className="flex items-center gap-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          onClick={() => navigate("/add/price")}
          aria-label="Back"
          className="focus-ring min-h-[56px] min-w-[56px] text-[var(--clr-ink)]"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-bold" style={{ color: "var(--clr-ink)" }}>
          कहाँ बेचें
        </h1>
      </header>

      <div className="mt-4 flex flex-col gap-3">
        {eligibility.map((e) => {
          const meta = CHANNELS.find((c) => c.key === e.channel);
          return (
            <div
              key={e.channel}
              className="flex items-center justify-between rounded-[16px] bg-white px-4 py-3"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold" style={{ color: "var(--clr-ink)" }}>
                  {meta?.name}{" "}
                  {e.eligible ? (
                    <Check size={16} className="inline" style={{ color: "var(--clr-success)" }} />
                  ) : (
                    <AlertTriangle
                      size={16}
                      className="inline"
                      style={{ color: "var(--clr-warn)" }}
                    />
                  )}
                </div>
                <div className="text-[12px]" style={{ color: "var(--clr-ink-soft)" }}>
                  {meta?.desc}
                </div>
                {!e.eligible && (
                  <button
                    onClick={() => fix(e.channel)}
                    className="focus-ring mt-1 min-h-[44px] rounded-full px-3 text-[12px] font-bold text-white"
                    style={{ background: "var(--clr-terracotta)" }}
                  >
                    ठीक करें
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={() => void sell()}
          disabled={publishing || eligibility.every((e) => !e.eligible)}
          className="focus-ring flex min-h-[60px] w-full items-center justify-center rounded-[20px] text-[18px] font-bold text-white disabled:opacity-40"
          style={{ background: "var(--clr-terracotta)", boxShadow: "var(--shadow-glow)" }}
        >
          {publishing ? "भेज रहे हैं…" : "बेचें / SELL"}
        </button>
      </div>
    </div>
  );
}
