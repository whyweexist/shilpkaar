// Lazy model manager: transformers.js v3 loaded on first use only.
// Runtime selection: WebGPU -> WASM -> server. Never in main bundle.

type ProgressCb = (pct: number, mbLoaded: number) => void;

interface Pipeline {
  (img: unknown, opts?: unknown): Promise<unknown>;
}

interface SegModel {
  segment: (input: HTMLCanvasElement | HTMLImageElement) => Promise<Uint8ClampedArray>;
}

let segModel: SegModel | null = null;
let loading: Promise<SegModel> | null = null;

export type Backend = "webgpu" | "wasm" | "server" | "none";

let activeBackend: Backend = "none";
export function getBackend(): Backend {
  return activeBackend;
}

function isLowEnd(): boolean {
  const dm = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  return typeof dm === "number" && dm < 3;
}

async function wasmInitWithin(ms: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const t0 = Date.now();
    const check = (): void => {
      if (Date.now() - t0 > ms) return resolve(false);
      resolve(true);
    };
    void check();
  });
}

export async function loadSegmentationModel(
  onProgress?: ProgressCb,
  force = false,
): Promise<SegModel> {
  if (segModel && !force) return segModel;
  if (loading) return loading;
  loading = (async () => {
    const { env, AutoModel, AutoProcessor, RawImage } = await import("@huggingface/transformers");
    // model choice: BiRefNet_lite q8. RMBG-1.4 behind env flag (non-commercial licence).
    const modelId =
      import.meta.env.VITE_USE_RMBG === "1" ? "briaai/RMBG-1.4" : "onnx-community/BiRefNet_lite";
    env.allowLocalModels = false;
    let usedWasm = false;
    if (typeof navigator !== "undefined" && "gpu" in navigator && !isLowEnd()) {
      try {
        if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.proxy = false;
        const model = await AutoModel.from_pretrained(modelId, {
          device: "webgpu",
          dtype: "q8",
          progress_callback: makeProgress(onProgress),
        });
        const processor = await AutoProcessor.from_pretrained(modelId);
        activeBackend = "webgpu";
        segModel = makeSeg(model, processor, RawImage);
        return segModel;
      } catch {
        // fall through to wasm
      }
    }
    try {
      usedWasm = true;
      const ok = await wasmInitWithin(6000);
      if (!ok && isLowEnd()) throw new Error("wasm too slow on low-end");
      const model = await AutoModel.from_pretrained(modelId, {
        device: "wasm",
        dtype: "q8",
        progress_callback: makeProgress(onProgress),
      });
      const processor = await AutoProcessor.from_pretrained(modelId);
      activeBackend = "wasm";
      segModel = makeSeg(model, processor, RawImage);
      void usedWasm;
      return segModel;
    } catch {
      activeBackend = "server";
      segModel = {
        segment: async (input) => serverSegment(input),
      };
      return segModel;
    }
  })();
  return loading;
}

function makeProgress(onProgress?: ProgressCb) {
  return (data: unknown): void => {
    const d = data as { status?: string; progress?: number; loaded?: number; total?: number };
    if (d.status === "progress" && onProgress) {
      onProgress(Math.round(d.progress ?? 0), Math.round((d.loaded ?? 0) / 1024 / 1024));
    }
  };
}

function makeSeg(model: unknown, processor: unknown, RawImage: unknown): SegModel {
  return {
    segment: async (input) => {
      const img = (RawImage as { fromCanvas: (c: HTMLCanvasElement) => unknown }).fromCanvas(
        input as HTMLCanvasElement,
      );
      const p = await (processor as { __call__: (i: unknown) => Promise<unknown> }).__call__(img);
      const out = await (model as Pipeline)((p as { pixel_values: unknown }).pixel_values);
      const raw = (out as { output?: unknown }).output ?? out;
      const arr = Array.isArray(raw)
        ? (raw[0] as { data: ArrayLike<number> }).data
        : (raw as unknown as { data: ArrayLike<number> }).data;
      return new Uint8ClampedArray(arr as ArrayLike<number>);
    },
  };
}

async function serverSegment(
  input: HTMLCanvasElement | HTMLImageElement,
): Promise<Uint8ClampedArray> {
  // POST to services/ml /segment — canvas -> blob -> b64
  const ML_URL =
    (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_ML_URL ?? "";
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  const src = input instanceof HTMLCanvasElement ? input : await loadImage(input.src);
  ctx.drawImage(src, 0, 0, 512, 512);
  const blob = await new Promise<null | Blob>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("blob fail");
  const fd = new FormData();
  fd.append("file", blob, "frame.png");
  const res = await fetch(`${ML_URL}/segment`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`segment ${res.status}`);
  const json = (await res.json()) as { enhanced_b64: string; width: number; height: number };
  // decode b64 to ImageData
  const img = await loadImage(`data:image/png;base64,${json.enhanced_b64}`);
  const c2 = document.createElement("canvas");
  c2.width = json.width;
  c2.height = json.height;
  const cx = c2.getContext("2d");
  if (!cx) throw new Error("ctx");
  cx.drawImage(img, 0, 0);
  return cx.getImageData(0, 0, json.width, json.height).data;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img load"));
    img.src = src;
  });
}
