import { WifiOff } from "lucide-react";

export function Offline() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <WifiOff size={48} style={{ color: "var(--clr-ink-soft)" }} />
      <h1 className="mt-4 text-[20px] font-bold" style={{ color: "var(--clr-ink)" }}>
        आप ऑफ़लाइन हैं
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--clr-ink-soft)" }}>
        यह पेज कैश में नहीं था — लेकिन आपका बाकी ऐप ऑफ़लाइन भी चलता है। नया उत्पाद बनाना, फोटो,
        आवाज़, कीमत — सब ऑफ़लाइन। इंटरनेट आते ही सब सिंक हो जाएगा।
      </p>
      <button
        onClick={() => window.history.back()}
        className="focus-ring mt-6 flex min-h-[56px] items-center rounded-full px-8 text-[15px] font-bold text-white"
        style={{ background: "var(--clr-terracotta)" }}
      >
        वापस जाएं
      </button>
    </div>
  );
}
