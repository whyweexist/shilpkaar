// Bhashini adapter interface + working mock default. Real ULCA two-step when keys present.

export interface AsrTranslateInput {
  audioBase64Wav16k: string;
  sourceLang: string;
  targetLang: string;
}

export interface BhashiniResult {
  text: string;
  provider: "bhashini" | "mock";
}

export interface BhashiniAdapter {
  name: string;
  transcribeTranslate(input: AsrTranslateInput): Promise<BhashiniResult>;
}

export function bhashiniConfigured(): boolean {
  return Boolean(
    (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_BHASHINI_KEY,
  );
}

/** Mock adapter — deterministic, always works, clearly labelled. */
export const mockBhashiniAdapter: BhashiniAdapter = {
  name: "mock",
  async transcribeTranslate(input) {
    // deterministic echo-transcription: in a real integration this would call ULCA.
    return {
      text: `[mock:${input.sourceLang}] ${input.audioBase64Wav16k.slice(0, 0)}`,
      provider: "mock",
    };
  },
};

/** Real adapter — ULCA config call then compute call; falls back to mock on any error. */
export const realBhashiniAdapter: BhashiniAdapter = {
  name: "bhashini",
  async transcribeTranslate(input) {
    const key =
      (import.meta as unknown as { env: Record<string, string | undefined> }).env
        .VITE_BHASHINI_KEY ?? "";
    const userId =
      (import.meta as unknown as { env: Record<string, string | undefined> }).env
        .VITE_BHASHINI_USER_ID ?? "";
    try {
      const cfgRes = await fetch("https://meity-auth.ulcacontrib.org/aogular/v1/ulca/apis", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          task: "asr",
          sourceLanguage: input.sourceLang,
          targetLanguage: input.targetLang,
          userId,
        }),
      });
      if (!cfgRes.ok) throw new Error(`ulca cfg ${cfgRes.status}`);
      const cfg = (await cfgRes.json()) as {
        output?: Array<{ serviceId?: string; apiEndPoint?: string }>;
      };
      const service = cfg.output?.[0];
      if (!service?.apiEndPoint) throw new Error("no endpoint");
      const computeRes = await fetch(service.apiEndPoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          serviceId: service.serviceId,
          audio: [{ audioContent: input.audioBase64Wav16k }],
          sourceLanguage: input.sourceLang,
          targetLanguage: input.targetLang,
        }),
      });
      if (!computeRes.ok) throw new Error(`ulca compute ${computeRes.status}`);
      const out = (await computeRes.json()) as {
        output?: Array<{ source?: string; target?: string }>;
      };
      const text = out.output?.[0]?.target ?? out.output?.[0]?.source ?? "";
      return { text, provider: "bhashini" };
    } catch {
      return mockBhashiniAdapter.transcribeTranslate(input);
    }
  },
};

export function getBhashini(): BhashiniAdapter {
  return bhashiniConfigured() ? realBhashiniAdapter : mockBhashiniAdapter;
}

/** Encode MediaRecorder webm blob -> base64 WAV 16k mono (Bhashini does not accept WebM). */
export async function webmToWav16kMonoBase64(blob: Blob): Promise<string> {
  const arrayBuf = await blob.arrayBuffer();
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  const ch = rendered.getChannelData(0);
  const wav = encodeWav(ch, 16000);
  void ctx.close();
  return arrayBufferToB64(wav);
}

function encodeWav(samples: Float32Array, sr: number): ArrayBuffer {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const w = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  w(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

function arrayBufferToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH)
    bin += String.fromCharCode(...bytes.subarray(i, i + CH));
  return btoa(bin);
}
