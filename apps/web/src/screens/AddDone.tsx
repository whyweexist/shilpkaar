import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAddStore } from "../store/addStore";
import { useAppStore } from "../store/appStore";
import { speak } from "../ml/tts";
import { Home } from "lucide-react";

export function AddDone() {
  const navigate = useNavigate();
  const { draft, reset } = useAddStore();
  const { showToast } = useAppStore();

  useEffect(() => {
    speak("बधाई हो! आपका उत्पाद कई जगह बिकने लगा। QR शेयर करें और ऑर्डर का इंतज़ार करें।");
  }, []);

  const microstoreUrl = `${window.location.origin}/s/rajesh-kumar/${
    draft.titleEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40) || "product"
  }`;

  async function share(): Promise<void> {
    const text = `${draft.titleHi} — देखें और खरीदें`;
    if (navigator.share) {
      try {
        await navigator.share({ title: draft.titleHi, text, url: microstoreUrl });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(microstoreUrl);
      showToast("लिंक कॉपी हो गया");
    }
  }

  function downloadQr(): void {
    showToast("QR प्रिंट पेज पर जाएं — नीचे लिंक से खोलें");
  }
  void downloadQr;

  return (
    <div className="flex min-h-screen flex-col items-center px-[18px] pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+24px)]">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full text-[36px]"
        style={{ background: "rgba(46,158,91,0.12)" }}
      >
        🎉
      </div>
      <h1
        className="mt-4 text-center font-bold"
        style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--clr-ink)" }}
      >
        बिक्री शुरू!
      </h1>
      <p className="mt-2 text-center text-[15px]" style={{ color: "var(--clr-ink)" }}>
        आपका उत्पाद <b>4 जगह बिक रहा है</b>
      </p>

      <div className="mt-6 flex w-full flex-col gap-3">
        <button
          onClick={() => void share()}
          className="focus-ring flex min-h-[56px] w-full items-center justify-center rounded-[16px] text-[15px] font-bold text-white"
          style={{ background: "var(--clr-success)" }}
        >
          📤 शेयर करें
        </button>
        <a
          href={`${microstoreUrl}/qr`}
          target="_blank"
          rel="noreferrer"
          className="focus-ring flex min-h-[56px] w-full items-center justify-center rounded-[16px] text-[15px] font-semibold"
          style={{
            background: "white",
            color: "var(--clr-ink)",
            boxShadow: "var(--shadow-card)",
            border: "1px solid var(--clr-border)",
          }}
        >
          🔳 QR देखें / प्रिंट करें
        </a>
        <button
          onClick={() => {
            sessionStorage.setItem("sh_show_ondc", "1");
            navigate("/insights");
          }}
          className="focus-ring flex min-h-[56px] w-full items-center justify-center rounded-[16px] text-[15px] font-semibold"
          style={{
            background: "white",
            color: "var(--clr-ink)",
            boxShadow: "var(--shadow-card)",
            border: "1px solid var(--clr-border)",
          }}
        >
          📄 ONDC पेलोड + GeM CSV देखें
        </button>
      </div>

      <div
        className="mt-6 w-full rounded-[16px] bg-white p-4 text-[13px]"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="font-bold" style={{ color: "var(--clr-ink)" }}>
          सार्वजनिक लिंक
        </div>
        <div className="mt-1 break-all" style={{ color: "var(--clr-terracotta)" }}>
          {microstoreUrl}
        </div>
      </div>

      <button
        onClick={() => {
          reset();
          navigate("/");
        }}
        className="focus-ring mt-auto flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[16px] text-[15px] font-bold text-white"
        style={{ background: "var(--clr-maroon-800)", marginTop: 24 }}
      >
        <Home size={18} /> होम पर जाएं
      </button>
    </div>
  );
}
