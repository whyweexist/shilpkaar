import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAddStore } from "../store/addStore";
import { speak, stopSpeak } from "../ml/tts";
import { apiPost } from "../lib/api";
import { ChevronLeft, Check, RotateCcw, Mic } from "lucide-react";

export function AddConfirm() {
  const navigate = useNavigate();
  const { draft, setCopy } = useAddStore();
  const [repairNote, setRepairNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const d = draft;
    const text = `सुनें: ${d.titleHi}। ${d.descriptionHi}`;
    speak(text);
    if (d.repairs.length > 0) {
      setRepairNote(
        `शब्द सुधार: ${d.repairs
          .slice(0, 4)
          .map((r) => `${r.from} → ${r.to}`)
          .join(", ")}`,
      );
    }
    return () => stopSpeak();
  }, [draft]);

  async function regenerate(): Promise<void> {
    setLoading(true);
    stopSpeak();
    // voice-correct: ask again
    navigate("/add/speak");
  }

  function confirmOk(): void {
    speak("ठीक है! अब कीमत निकालते हैं।", "hi-IN");
    navigate("/add/price");
  }

  function reread(): void {
    speak(`सुनें: ${draft.titleHi}। ${draft.descriptionHi}`);
  }

  const { setCopy: _unused } = useAddStore();
  void _unused;
  void setCopy;
  void apiPost;
  void loading;

  return (
    <div className="flex min-h-screen flex-col px-[18px] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <header className="flex items-center gap-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          onClick={() => navigate("/add/speak")}
          aria-label="Back"
          className="focus-ring min-h-[56px] min-w-[56px] text-[var(--clr-ink)]"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-bold" style={{ color: "var(--clr-ink)" }}>
          सुनें और पुष्टि करें
        </h1>
      </header>

      <div className="mt-4 rounded-[20px] bg-white p-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="text-[20px] font-bold" style={{ color: "var(--clr-ink)" }}>
          {draft.titleHi}
        </h2>
        <p className="mt-1 text-[13px]" style={{ color: "var(--clr-ink-soft)" }}>
          {draft.titleEn}
        </p>
        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--clr-ink)" }}>
          {draft.descriptionHi}
        </p>
        {draft.keywords.length > 0 && (
          <p className="mt-2 text-[12px]" style={{ color: "var(--clr-ink-soft)" }}>
            {draft.keywords.join(" • ")}
          </p>
        )}
        {repairNote && (
          <p
            className="mt-3 rounded-[12px] px-3 py-2 text-[12px]"
            style={{ background: "var(--clr-cream-2)", color: "var(--clr-ink)" }}
          >
            🔧 {repairNote}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={reread}
          className="focus-ring flex min-h-[56px] items-center justify-center gap-2 rounded-[16px] border text-[15px] font-semibold"
          style={{ borderColor: "var(--clr-border)", color: "var(--clr-ink)" }}
        >
          <RotateCcw size={18} /> फिर सुनें
        </button>
        <div className="flex gap-3">
          <button
            onClick={regenerate}
            className="focus-ring flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-[16px] border text-[15px] font-semibold"
            style={{ borderColor: "var(--clr-border)", color: "var(--clr-ink)" }}
          >
            <Mic size={18} /> सुधारें
          </button>
          <button
            onClick={confirmOk}
            className="focus-ring flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-[16px] text-[15px] font-bold text-white"
            style={{ background: "var(--clr-success)" }}
          >
            <Check size={18} /> सही है
          </button>
        </div>
      </div>
    </div>
  );
}
