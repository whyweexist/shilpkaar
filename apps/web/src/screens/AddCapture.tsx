import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAddStore } from "../store/addStore";
import { enhanceShot, makeRenditions } from "../ml/segmentation";
import { speak } from "../ml/tts";
import { MicButton } from "../components/MicButton";
import { X, ChevronLeft } from "lucide-react";

const ROLES = [
  { key: "front" as const, hi: "सामने की फोटो", coach: "उत्पाद को सामने से, अच्छी रोशनी में रखें" },
  { key: "back" as const, hi: "पीछे की फोटो", coach: "उत्पाद पलटें" },
  { key: "texture" as const, hi: "बनावट की क्लोज़-अप", coach: "पास जाएं — बुनावट/नक्काशी दिखे" },
  { key: "scale" as const, hi: "साइज़ दिखाएं", coach: "पास में कोई सिक्का या हाथ रखें" },
  { key: "maker" as const, hi: "कारीगर/लूम की फोटो", coach: "खुद को या अपने औज़ार के साथ दिखाएं" },
];

export function Capture() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [coach, setCoach] = useState("");
  const [segPreview, setSegPreview] = useState<string | null>(null);
  const { addShot, draft } = useAddStore();
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, []);

  async function startCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1024, height: 1024 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCoach("कैमरा नहीं खुला — गैलरी से चुनें");
    }
  }

  function stopCamera(): void {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // sharpness + exposure coach (downsampled luma variance)
  function frameQuality(): "ok" | "dark" | "blurry" {
    const v = videoRef.current;
    if (!v || !canvasRef.current) return "ok";
    const c = canvasRef.current;
    c.width = 64;
    c.height = 64;
    const cx = c.getContext("2d", { willReadFrequently: true });
    if (!cx) return "ok";
    cx.drawImage(v, 0, 0, 64, 64);
    const d = cx.getImageData(0, 0, 64, 64).data;
    let sum = 0,
      sumSq = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      sum += l;
      sumSq += l * l;
    }
    const n = d.length / 4;
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    if (mean < 50) return "dark";
    if (variance < 200) return "blurry"; // flat frame
    return "ok";
  }

  async function captureShot(): Promise<void> {
    const v = videoRef.current;
    if (!v || busy) return;
    setBusy(true);
    const role = ROLES[step].key;
    const q = frameQuality();
    if (q === "dark") {
      setCoach("रोशनी कम है — खिड़की की तरफ मुड़ें");
      speak("रोशनी कम है, खिड़की की तरफ मुड़ें");
      setBusy(false);
      return;
    }
    if (q === "blurry") {
      setCoach("फोटो धुंधली है — हाथ स्थिर रखें");
      speak("फोटो धुंधली है, हाथ स्थिर रखें");
      setBusy(false);
      return;
    }
    const shot = document.createElement("canvas");
    shot.width = 768;
    shot.height = 768;
    const sx = shot.getContext("2d");
    if (!sx) {
      setBusy(false);
      return;
    }
    const side = Math.min(v.videoWidth, v.videoHeight) || 768;
    sx.drawImage(
      v,
      (v.videoWidth - side) / 2 || 0,
      (v.videoHeight - side) / 2 || 0,
      side,
      side,
      0,
      0,
      768,
      768,
    );
    try {
      speak("संसाधन हो रहा है, एक क्षण…", "hi-IN");
      const result = await enhanceShot(shot);
      setSegPreview(result.enhancedDataUrl);
      void makeRenditions(result.enhancedDataUrl);
      addShot({ role, dataUrl: result.enhancedDataUrl, fidelity: result.fidelity });
      if (step < 4) {
        setStep(step + 1);
        speak(`${ROLES[step + 1].coach}`);
        setCoach(ROLES[step + 1].coach);
      } else {
        speak("पाँच फोटो हो गईं। अब बोलें।");
        navigate("/add/speak");
      }
    } catch {
      // conservative: raw shot without ML
      addShot({
        role,
        dataUrl: shot.toDataURL("image/webp", 0.85),
        fidelity: { deltaE: 0, ssim: 1, edgeIou: 1, passed: true, mode: "conservative" },
      });
      if (step < 4) {
        setStep(step + 1);
        setCoach(ROLES[step + 1].coach);
      } else navigate("/add/speak");
    } finally {
      setBusy(false);
    }
  }

  async function pickFromGallery(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("img"));
      i.src = URL.createObjectURL(f);
    });
    const shot = document.createElement("canvas");
    shot.width = 768;
    shot.height = 768;
    const sx = shot.getContext("2d");
    if (sx) {
      const side = Math.min(img.width, img.height);
      sx.drawImage(
        img,
        (img.width - side) / 2,
        (img.height - side) / 2,
        side,
        side,
        0,
        0,
        768,
        768,
      );
      try {
        const result = await enhanceShot(shot);
        addShot({
          role: ROLES[step].key,
          dataUrl: result.enhancedDataUrl,
          fidelity: result.fidelity,
        });
      } catch {
        addShot({
          role: ROLES[step].key,
          dataUrl: shot.toDataURL("image/webp", 0.85),
          fidelity: { deltaE: 0, ssim: 1, edgeIou: 1, passed: true, mode: "conservative" },
        });
      }
      if (step < 4) setStep(step + 1);
      else navigate("/add/speak");
    }
    setBusy(false);
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#1c0a05]">
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : navigate("/"))}
          className="focus-ring min-h-[56px] min-w-[56px] rounded-full text-white"
          aria-label="Back"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <div className="text-[15px] font-bold text-white">{ROLES[step].hi}</div>
          <div className="text-[12px]" style={{ color: "var(--clr-gold)" }}>
            {step + 1}/5
          </div>
        </div>
        <button
          onClick={() => navigate("/")}
          className="focus-ring min-h-[56px] min-w-[56px] rounded-full text-white"
          aria-label="Close"
        >
          <X size={24} />
        </button>
      </div>

      <div className="relative mx-3 mt-3 flex-1 overflow-hidden rounded-[24px]">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {segPreview && (
          <img
            src={segPreview}
            alt="cut-out preview"
            className="pointer-events-none absolute bottom-3 right-3 h-24 w-24 rounded-[12px] border-2"
            style={{ borderColor: "var(--clr-gold)" }}
          />
        )}
        {coach && (
          <div
            className="absolute inset-x-4 top-4 rounded-[12px] px-3 py-2 text-[13px] text-white"
            style={{ background: "rgba(74,17,8,0.75)" }}
          >
            🎙️ {coach}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex flex-col items-center gap-3 px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-4">
        <button
          onClick={() => void captureShot()}
          disabled={busy}
          className="focus-ring flex h-[72px] w-[72px] items-center justify-center rounded-full text-white disabled:opacity-50"
          style={{
            background: `radial-gradient(120% 120% at 30% 20%, var(--clr-terracotta-lt) 0%, var(--clr-terracotta) 65%)`,
            boxShadow: "var(--shadow-glow)",
          }}
          aria-label="Capture photo"
        >
          {busy ? (
            <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
          ) : (
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <circle cx="12" cy="13" r="3.5" />
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            </svg>
          )}
        </button>
        <label className="focus-ring flex min-h-[44px] items-center gap-2 text-[13px] text-white/80">
          🖼️ गैलरी से चुनें
          <input
            type="file"
            accept="image/*"
            onChange={(e) => void pickFromGallery(e)}
            className="hidden"
          />
        </label>
        <p className="text-center text-[11.5px] text-white/50">
          {draft.shots.length} शॉट पूर्ण • AI कट-आउट ऑन-डिवाइस
        </p>
      </div>
      <span className="hidden">
        <MicButton />
      </span>
    </div>
  );
}
