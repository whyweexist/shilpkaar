// CLIP embeddings — lazy, for category detection + comparables lookup client-side.
let embedFn: ((img: HTMLCanvasElement) => Promise<Float32Array>) | null = null;

export async function loadEmbedder(
  onProgress?: (pct: number) => void,
): Promise<(img: HTMLCanvasElement) => Promise<Float32Array>> {
  if (embedFn) return embedFn;
  const { pipeline } = await import("@huggingface/transformers");
  const clip = (await pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32", {
    progress_callback: (d: unknown) => {
      const dd = d as { status?: string; progress?: number };
      if (dd.status === "progress" && onProgress) onProgress(Math.round(dd.progress ?? 0));
    },
  })) as unknown as {
    (img: unknown, opts: unknown): Promise<Array<Array<number>>>;
  };
  embedFn = async (img) => {
    const out = await clip(img, { pooling: "mean", normalize: true });
    return new Float32Array(out[0]);
  };
  return embedFn;
}
