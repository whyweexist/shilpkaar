import { Mic } from "lucide-react";

interface Props {
  listening?: boolean;
  onClick?: () => void;
  size?: number;
}

export function MicButton({ listening, onClick, size = 72 }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={listening ? "Listening" : "Tap to speak"}
      className="focus-ring relative flex shrink-0 items-center justify-center rounded-full transition-transform active:scale-[0.98]"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(120% 120% at 30% 20%, var(--clr-terracotta-lt) 0%, var(--clr-terracotta) 65%)`,
        boxShadow: "var(--shadow-glow)",
      }}
    >
      {/* breathing animation when idle, ripple when listening handled via CSS */}
      <Mic className="text-white" size={30} aria-hidden />
      {listening && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            border: "2px solid rgba(255,255,255,0.5)",
            animation: "ripple 1.2s ease-out infinite",
          }}
        />
      )}
      <style>{`@keyframes ripple{0%{transform:scale(1);opacity:0.7}100%{transform:scale(1.35);opacity:0}} @media(prefers-reduced-motion:reduce){*{animation:none!important}}`}</style>
    </button>
  );
}
