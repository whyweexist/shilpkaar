export function speak(text: string, lang = "hi-IN"): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export function stopSpeak(): void {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
