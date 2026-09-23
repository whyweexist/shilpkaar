import { useNavigate } from "react-router-dom";
import { MicButton } from "./MicButton";
import { useAppStore } from "../store/appStore";
import { speak } from "../ml/tts";

const LANGS = ["hi", "en", "bn", "ta"] as const;

export function VoiceHeroCard() {
  const navigate = useNavigate();
  const { micListening, setMicListening, language, setLanguage } = useAppStore();

  const handleTap = () => {
    speak("चलिए! कैमरा खोलते हैं — उत्पाद की फोटो लें", "hi-IN");
    navigate("/add");
  };

  const handleLongPress = () => {
    const idx = LANGS.indexOf(language as (typeof LANGS)[number]);
    const next = LANGS[(idx + 1) % LANGS.length];
    setLanguage(next);
    setMicListening(false);
    speak(next === "hi" ? "भाषा: हिंदी" : `Language: ${next}`, `${next}-IN`);
  };

  const onPointerDown = () => {
    window.setTimeout(() => {}, 0);
  };
  const timer = { current: 0 as number };

  return (
    <div
      className="relative flex min-h-[190px] w-full min-w-0 flex-col items-center justify-center overflow-hidden px-4 py-6 text-center sm:px-6"
      style={{
        background: `linear-gradient(180deg, #5A1A0D 0%, #7A2E18 100%)`,
        borderRadius: "var(--r-xl)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800&q=80&auto=format')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(74,17,8,0.2) 0%, rgba(74,17,8,0.55) 100%)",
        }}
        aria-hidden
      />

      <div
        className="relative flex shrink-0"
        onTouchStart={() => {
          timer.current = window.setTimeout(handleLongPress, 600);
        }}
        onTouchEnd={() => {
          micListening && setMicListening(false);
          window.clearTimeout(timer.current);
        }}
        onMouseDown={onPointerDown}
        onMouseUp={() => window.clearTimeout(timer.current)}
        onContextMenu={(e) => {
          e.preventDefault();
          handleLongPress();
        }}
      >
        <div className="animate-[breath_2.4s_ease-in-out_infinite] motion-reduce:animate-none">
          <MicButton listening={micListening} onClick={handleTap} />
        </div>
      </div>
      <h2
        className="relative mt-4 max-w-full break-words"
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "var(--clr-on-maroon)",
          fontFamily: "var(--font-ui)",
        }}
      >
        Bolke List Karo
      </h2>
      <p
        className="relative mt-1 w-full max-w-[260px] break-words"
        style={{ fontSize: "12.5px", color: "rgba(242,193,133,0.75)", lineHeight: 1.4 }}
      >
        बोलके लिस्ट करो • Tap or say to list your product via voice
      </p>
      <p className="relative mt-1 text-[10px]" style={{ color: "rgba(242,193,133,0.5)" }}>
        दबाकर रखें = भाषा बदलें ({language.toUpperCase()})
      </p>

      <style>{`@keyframes breath{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}`}</style>
    </div>
  );
}
