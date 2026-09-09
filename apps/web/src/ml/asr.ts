// ASR: Web Speech API primary (hi-IN, bn-IN, ta-IN, en-IN); whisper-tiny via transformers.js fallback.

export type AsrResult = { text: string; source: "web-speech" | "whisper" };

export function webSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "webkitSpeechRecognition" in window;
}

export function startWebSpeech(
  lang: string,
  onText: (finalText: string, partial: string) => void,
  onEnd: () => void,
  maxMs = 40000,
): { stop: () => void } {
  const SR = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
    .webkitSpeechRecognition;
  if (!SR) throw new Error("no web speech");
  const rec = new SR();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  let finalText = "";
  const timer = window.setTimeout(() => rec.stop(), maxMs);
  rec.onresult = (e: SpeechRecognitionLikeEvent) => {
    let partial = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript + " ";
      else partial += r[0].transcript;
    }
    onText(finalText.trim(), partial);
  };
  rec.onend = () => {
    window.clearTimeout(timer);
    onEnd();
  };
  rec.onerror = () => {
    window.clearTimeout(timer);
    onEnd();
  };
  rec.start();
  return {
    stop: () => {
      window.clearTimeout(timer);
      rec.stop();
    },
  };
}

// whisper-tiny fallback (lazy, heavy)
let whisperPipeline: ((audio: Float32Array, opts?: unknown) => Promise<{ text: string }>) | null =
  null;
let whisperLoading: Promise<void> | null = null;

export async function whisperAvailable(): Promise<boolean> {
  if (webSpeechAvailable()) return false; // primary path
  return true;
}

export async function loadWhisper(onProgress?: (pct: number) => void): Promise<void> {
  if (whisperPipeline) return;
  if (whisperLoading) return whisperLoading;
  whisperLoading = (async () => {
    const { pipeline } = await import("@huggingface/transformers");
    whisperPipeline = (await pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-tiny",
      {
        dtype: "q8",
        progress_callback: (d: unknown) => {
          const dd = d as { status?: string; progress?: number };
          if (dd.status === "progress" && onProgress) onProgress(Math.round(dd.progress ?? 0));
        },
      },
    )) as unknown as typeof whisperPipeline;
  })();
  return whisperLoading;
}

export async function transcribeWithWhisper(audio: Float32Array): Promise<string> {
  if (!whisperPipeline) await loadWhisper();
  if (!whisperPipeline) throw new Error("whisper not loaded");
  const out = await whisperPipeline(audio, { language: "hi", task: "transcribe" });
  return out.text.trim();
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionLikeEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

interface SpeechRecognitionLikeEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
