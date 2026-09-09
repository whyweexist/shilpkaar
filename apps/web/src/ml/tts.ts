// TTS: speechSynthesis with correct lang + on-screen transcript support.

export function speak(text: string, lang = "hi-IN"): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95;
  u.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const match =
    voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
  if (match) u.voice = match;
  window.speechSynthesis.speak(u);
}

export function speakSequence(
  texts: Array<{ text: string; lang?: string }>,
  onDone?: () => void,
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  let i = 0;
  const next = (): void => {
    if (i >= texts.length) {
      onDone?.();
      return;
    }
    const t = texts[i];
    const u = new SpeechSynthesisUtterance(t.text);
    u.lang = t.lang ?? "hi-IN";
    u.rate = 0.95;
    u.onend = () => {
      i++;
      next();
    };
    window.speechSynthesis.speak(u);
  };
  next();
}

export function stopSpeak(): void {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
