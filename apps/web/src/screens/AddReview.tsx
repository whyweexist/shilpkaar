import { useNavigate } from "react-router-dom";
import { useAddStore } from "../store/addStore";
import { speak } from "../ml/tts";
import { ChevronLeft, ChevronRight, RotateCcw, Trash2 } from "lucide-react";

export function AddReview() {
  const navigate = useNavigate();
  const { draft, removeShot } = useAddStore();
  const f = draft.shots[0]?.fidelity;

  return (
    <div className="flex min-h-screen flex-col pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <header className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          onClick={() => navigate("/add")}
          className="focus-ring min-h-[56px] min-w-[56px] text-[var(--clr-ink)]"
          aria-label="Back"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[16px] font-bold" style={{ color: "var(--clr-ink)" }}>
          फोटो जाँच
        </h1>
        <span className="w-14" />
      </header>

      <div className="mx-[18px] mt-4 grid grid-cols-2 gap-3">
        {draft.shots.map((s) => (
          <div
            key={s.role}
            className="relative overflow-hidden rounded-[16px] bg-white"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <img src={s.dataUrl} alt={s.role} className="aspect-square w-full object-cover" />
            <div className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-semibold text-white">
              {s.role}
            </div>
            <div className="absolute bottom-1 right-1 flex gap-1">
              <button
                onClick={() => {
                  removeShot(s.role);
                  navigate("/add");
                }}
                aria-label={`Retake ${s.role}`}
                className="focus-ring flex h-11 w-11 items-center justify-center rounded-full bg-white/90"
              >
                <RotateCcw size={18} />
              </button>
              <button
                onClick={() => removeShot(s.role)}
                aria-label={`Delete ${s.role}`}
                className="focus-ring flex h-11 w-11 items-center justify-center rounded-full bg-white/90"
                style={{ color: "var(--clr-danger)" }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {f && (
        <div
          className="mx-[18px] mt-4 flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold"
          style={{ background: "var(--clr-cream-2)", color: "var(--clr-ink)" }}
        >
          <span>
            {f.passed ? "✓" : "⚠"} Colour {f.deltaE.toFixed(1)}
          </span>
          <span>·</span>
          <span>Texture {f.ssim.toFixed(2)}</span>
          <span>·</span>
          <span>Shape {f.edgeIou.toFixed(2)}</span>
        </div>
      )}
      {f && !f.passed && (
        <p className="mx-[18px] mt-2 text-center text-[12px]" style={{ color: "var(--clr-warn)" }}>
          फिडेलिटी गेट फेल — सुरक्षित संपादन (क्रॉप + एक्सपोज़र) लागू किया गया है
        </p>
      )}

      <div className="mt-auto px-[18px]">
        <button
          onClick={() => {
            speak("अब अपने उत्पाद के बारे में बताएं");
            navigate("/add/speak");
          }}
          disabled={draft.shots.length === 0}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-[16px] py-4 text-[16px] font-bold text-white disabled:opacity-40"
          style={{ background: "var(--clr-terracotta)", minHeight: 56 }}
        >
          आगे बोलें <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
