import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAddStore } from "../store/addStore";
import { useAppStore } from "../store/appStore";
import { startWebSpeech, webSpeechAvailable } from "../ml/asr";
import { speak } from "../ml/tts";
import { fuzzyRepairTokens, extractAttributes, generateCopy } from "../lib/copyGen";
import { ChevronLeft } from "lucide-react";

const MAX_MS = 40000;

export function AddSpeak() {
  const navigate = useNavigate();
  const { setTranscript, setCopy, draft } = useAddStore();
  const { language } = useAppStore();
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [finalText, setFinalText] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const stopRef = useRef<() => void>(() => undefined);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    speak("अपने उत्पाद के बारे में बताएं — जैसे: यह चंदेरी का दुपट्टा है, रेशम का, नीला रंग");
    return () => {
      stopRef.current();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  function start(): void {
    if (listening) return;
    setListening(true);
    setElapsed(0);
    const t0 = Date.now();
    timerRef.current = window.setInterval(() => {
      const e = (Date.now() - t0) / 1000;
      setElapsed(e);
      if (e * 1000 >= MAX_MS) stopRef.current();
    }, 250);
    const langMap: Record<string, string> = { hi: "hi-IN", en: "en-IN", bn: "bn-IN", ta: "ta-IN" };
    if (webSpeechAvailable()) {
      const h = startWebSpeech(
        langMap[language] ?? "hi-IN",
        (final, p) => {
          setFinalText(final);
          setPartial(p);
        },
        () => finish(),
        MAX_MS,
      );
      stopRef.current = h.stop;
    } else {
      // whisper fallback needs recorded audio; for typed-free UX we still allow the flow via server later.
      // Show honest notice and reuse last transcript if any.
      setListening(false);
      speak("इस ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं — कृपया Chrome आज़माएं");
      setPartial("(आवाज़ पहचान अनुपलब्ध — Chrome या Edge उपयोग करें)");
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  }

  function finish(): void {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setListening(false);
    const text = finalText || partial;
    if (text.trim().length < 3) {
      speak("कुछ समझ नहीं आया — फिर से बोलें");
      return;
    }
    process(text);
  }

  function process(text: string): void {
    speak("समझ रहे हैं…", "hi-IN");
    const { repaired, repairs } = fuzzyRepairTokens(text);
    const attrs = extractAttributes(repaired);
    const copy = generateCopy(attrs, repaired);
    setTranscript(text, repaired, repairs);
    setCopy({
      titleEn: copy.titleEn,
      titleHi: copy.titleHi,
      descriptionEn: copy.descriptionEn,
      descriptionHi: copy.descriptionHi,
      keywords: copy.keywords,
      attributes: Object.fromEntries(
        Object.entries(attrs).filter(([, v]) => v !== undefined),
      ) as Record<string, string>,
    });
    navigate("/add/confirm");
  }

  return (
    <div className="flex min-h-screen flex-col px-[18px] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <header className="flex items-center gap-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          onClick={() => navigate("/add")}
          className="focus-ring min-h-[56px] min-w-[56px] text-[var(--clr-ink)]"
          aria-label="Back"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-bold" style={{ color: "var(--clr-ink)" }}>
          बोलके बताएं
        </h1>
      </header>

      <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-6">
        <button
          onClick={() => (listening ? stopRef.current() : start())}
          className="focus-ring relative flex h-[96px] w-[96px] items-center justify-center rounded-full text-white"
          style={{
            background: `radial-gradient(120% 120% at 30% 20%, var(--clr-terracotta-lt) 0%, var(--clr-terracotta) 65%)`,
            boxShadow: "var(--shadow-glow)",
          }}
          aria-label={listening ? "Stop" : "Speak"}
        >
          {listening && (
            <span className="absolute inset-0 animate-[ripple_1.2s_ease-out_infinite] rounded-full border-2 border-white/50" />
          )}
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
            <path d="M19 10a7 7 0 0 1-14 0" />
            <path d="M12 19v3" />
          </svg>
        </button>
        <div className="text-center">
          <div className="text-[15px] font-semibold" style={{ color: "var(--clr-ink)" }}>
            {listening ? `सुन रहे हैं… ${elapsed.toFixed(0)}s / 40s` : "बड़ा माइक दबाएं और बोलें"}
          </div>
          <div className="mt-1 text-[12px]" style={{ color: "var(--clr-ink-soft)" }}>
            जैसे: "यह टेराकोटा का दीपक है, हाथ से बना"
          </div>
        </div>

        <div
          className="min-h-[72px] w-full rounded-[16px] bg-white px-4 py-3 text-[14px] leading-relaxed"
          style={{ boxShadow: "var(--shadow-card)", color: "var(--clr-ink)" }}
        >
          {finalText || partial ? (
            <>
              <p>
                {finalText} <span className="opacity-50">{partial}</span>
              </p>
            </>
          ) : (
            <p className="opacity-40">आपकी आवाज़ यहाँ लिखी दिखेगी…</p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            setFinalText("");
            setPartial("");
            void start();
          }}
          className="focus-ring min-h-[56px] flex-1 rounded-[16px] border text-[15px] font-semibold"
          style={{ borderColor: "var(--clr-border)", color: "var(--clr-ink)" }}
        >
          फिर से
        </button>
        <button
          onClick={() => finish()}
          disabled={!finalText && !partial}
          className="focus-ring min-h-[56px] flex-1 rounded-[16px] text-[15px] font-bold text-white disabled:opacity-40"
          style={{ background: "var(--clr-terracotta)" }}
        >
          आगे
        </button>
      </div>
      <p className="mt-2 text-center text-[11px]" style={{ color: "var(--clr-ink-soft)" }}>
        शॉट्स: {draft.shots.length}/5
      </p>
      <style>{`@keyframes ripple{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.4);opacity:0}}`}</style>
    </div>
  );
}
