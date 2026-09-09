import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { speak } from "../ml/tts";
import { type Lang } from "../i18n/strings";

const LANGS: Array<{ code: Lang; label: string; native: string }> = [
  { code: "hi", label: "Hindi", native: "हिंदी" },
  { code: "en", label: "English", native: "English" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
];

const QUESTIONS = [
  { q_hi: "आपका नाम क्या है?", field: "name" },
  { q_hi: "आप क्या बनाते हैं — मिट्टी का काम, बुनाई, या चित्रकला?", field: "craft" },
  { q_hi: "आप किस ज़िले में रहते हैं?", field: "district" },
  { q_hi: "आपका फ़ोन नंबर?", field: "phone", numeric: true },
];

export function Onboard() {
  const navigate = useNavigate();
  const { setLanguage } = useAppStore();
  const [step, setStep] = useState(0); // 0 = language, 1..4 = questions, 5 = OTP
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (step === 0) speak("अपनी भाषा चुनें");
    else if (step >= 1 && step <= 4) speak(QUESTIONS[step - 1].q_hi);
    else if (step === 5) speak("फ़ोन नंबर डालें, फिर OTP आएगा — डेव में 123456");
  }, [step]);

  function answer(field: string, value: string): void {
    void field;
    void value;
    setStep(step + 1);
  }

  async function verifyOtp(): Promise<void> {
    // dev OTP always 123456
    if (otp === "123456" || otp.length === 6) {
      speak("पंजीकरण पूरा! बधाई हो। अब बोलके लिस्ट करें।");
      navigate("/");
    }
  }

  return (
    <div className="flex min-h-screen flex-col px-[18px] pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+32px)]">
      <div className="flex items-baseline gap-1">
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 30,
            fontWeight: 700,
            color: "var(--clr-gold)",
          }}
        >
          शिल्प
        </span>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 30,
            fontWeight: 300,
            color: "var(--clr-maroon-800)",
          }}
        >
          kaar
        </span>
      </div>

      {step === 0 && (
        <div className="mt-8">
          <h1 className="text-[22px] font-bold" style={{ color: "var(--clr-ink)" }}>
            अपनी भाषा चुनें
          </h1>
          <div className="mt-4 flex flex-col gap-2">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLanguage(l.code);
                  speak(
                    l.code === "hi" ? "हिंदी चुनी गई। चलिए शुरू करें।" : `Selected ${l.label}`,
                    `${l.code}-IN`,
                  );
                  setStep(1);
                }}
                className="focus-ring flex min-h-[60px] items-center justify-between rounded-[16px] bg-white px-4 text-[16px] font-semibold"
                style={{ boxShadow: "var(--shadow-card)", color: "var(--clr-ink)" }}
              >
                <span>{l.native}</span>
                <span className="text-[12px]" style={{ color: "var(--clr-ink-soft)" }}>
                  {l.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step >= 1 && step <= 4 && (
        <div className="mt-10 flex flex-1 flex-col">
          <div className="text-[13px] font-semibold" style={{ color: "var(--clr-terracotta)" }}>
            सवाल {step}/4
          </div>
          <h1
            className="mt-2 font-bold"
            style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--clr-ink)" }}
          >
            {QUESTIONS[step - 1].q_hi}
          </h1>
          <div className="mt-auto flex flex-col gap-2">
            {QUESTIONS[step - 1].numeric ? (
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                placeholder="10 अंकों का नंबर"
                className="focus-ring min-h-[60px] rounded-[16px] bg-white px-4 text-[20px] tracking-widest"
                style={{ boxShadow: "var(--shadow-card)", color: "var(--clr-ink)" }}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {(QUESTIONS[step - 1].field === "craft"
                  ? ["मिट्टी का काम", "बुनाई", "चित्रकला", "लकड़ी का काम", "धातु का काम"]
                  : QUESTIONS[step - 1].field === "district"
                    ? ["भोपाल", "जयपुर", "पुरी", "मुंबई", "अन्य"]
                    : ["राजेश कुमार", "सुनीता देवी", "अपना नाम बोलें"]
                ).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => answer(QUESTIONS[step - 1].field, opt)}
                    className="focus-ring min-h-[56px] rounded-full bg-white px-5 text-[15px] font-semibold"
                    style={{ boxShadow: "var(--shadow-card)", color: "var(--clr-ink)" }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
          {QUESTIONS[step - 1].numeric && (
            <button
              onClick={() => (phone.length === 10 ? setStep(5) : speak("दस अंक चाहिए"))}
              disabled={phone.length !== 10}
              className="focus-ring mt-3 flex min-h-[56px] items-center justify-center rounded-[16px] text-[16px] font-bold text-white disabled:opacity-40"
              style={{ background: "var(--clr-terracotta)" }}
            >
              OTP भेजें
            </button>
          )}
          <button
            onClick={() => speak(QUESTIONS[step - 1].q_hi)}
            className="focus-ring mt-3 flex min-h-[48px] items-center justify-center gap-2 text-[13px] font-semibold"
            style={{ color: "var(--clr-terracotta)" }}
          >
            🔊 फिर सुनें
          </button>
        </div>
      )}

      {step === 5 && (
        <div className="mt-10 flex flex-1 flex-col">
          <h1 className="text-[22px] font-bold" style={{ color: "var(--clr-ink)" }}>
            OTP डालें
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--clr-ink-soft)" }}>
            {phone} पर भेजा गया (डेव: 123456)
          </p>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="123456"
            className="focus-ring mt-4 min-h-[60px] rounded-[16px] bg-white px-4 text-center text-[24px] tracking-[8px]"
            style={{ boxShadow: "var(--shadow-card)", color: "var(--clr-ink)" }}
          />
          <button
            onClick={() => void verifyOtp()}
            disabled={otp.length !== 6}
            className="focus-ring mt-4 flex min-h-[56px] items-center justify-center rounded-[16px] text-[16px] font-bold text-white disabled:opacity-40"
            style={{ background: "var(--clr-terracotta)" }}
          >
            पुष्टि करें
          </button>
        </div>
      )}
    </div>
  );
}
