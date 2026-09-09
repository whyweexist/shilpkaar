import { useEffect, useState } from "react";
import { lessons } from "@shilpkaar/shared";
import { speak, stopSpeak } from "../ml/tts";

export function Learn() {
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    speak("सीखो — छोटे-छोटे 40 सेकंड के पाठ। जिस पर टैप करें, सुनाई देगा।");
    return () => stopSpeak();
  }, []);

  const list = lessons as Array<{
    id: string;
    trigger: string;
    title_hi: string;
    title_en: string;
    script_hi: string;
    script_en: string;
    illustration: string;
  }>;

  function play(id: string): void {
    const l = list.find((x) => x.id === id);
    if (!l) return;
    setPlaying(id);
    speak(l.script_hi);
    setTimeout(() => setPlaying(null), 40000);
  }

  return (
    <div className="pb-[calc(var(--nav-h)+24px+env(safe-area-inset-bottom))]">
      <div className="px-[18px] pt-[calc(env(safe-area-inset-top)+16px)]">
        <h1 className="text-[22px] font-bold" style={{ color: "var(--clr-ink)" }}>
          सीखो (Sikho)
        </h1>
        <p className="text-[13px]" style={{ color: "var(--clr-ink-soft)" }}>
          40-सेकंड के बोलकर सुनाने वाले पाठ
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-3 px-[18px]">
        {list.map((l) => (
          <button
            key={l.id}
            onClick={() => play(l.id)}
            className="focus-ring flex items-center gap-4 rounded-[16px] bg-white p-4 text-left"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[24px]"
              style={{ background: "var(--clr-cream-2)" }}
            >
              {l.illustration}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold" style={{ color: "var(--clr-ink)" }}>
                {l.title_hi}
              </div>
              <div className="text-[12px]" style={{ color: "var(--clr-ink-soft)" }}>
                {l.title_en} • {l.trigger}
              </div>
            </div>
            {playing === l.id ? (
              <span
                className="h-5 w-5 animate-pulse rounded-full"
                style={{ background: "var(--clr-terracotta)" }}
              />
            ) : (
              <span className="text-[20px]" style={{ color: "var(--clr-terracotta)" }}>
                ▶
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
