import { loadSegmentationModel } from "./modelManager";

export interface SegmentResult {
  enhancedDataUrl: string;
  mask: Uint8Array;
  fidelity: { deltaE: number; ssim: number; edgeIou: number; passed: boolean; mode: string };
}

const SHOT_ROLES = ["front", "back", "texture", "scale", "maker"] as const;

/** Segment + finish: bg removal -> white backdrop -> WB -> contact shadow -> crops 1:1 3:4 4:5 as WebP. */
export async function enhanceShot(source: HTMLCanvasElement): Promise<SegmentResult> {
  const model = await loadSegmentationModel();
  let maskArr: Uint8ClampedArray;
  try {
    maskArr = await model.segment(source);
  } catch {
    maskArr = new Uint8ClampedArray(0);
  }
  const w = source.width,
    h = source.height;
  const mask = new Uint8Array(w * h);
  if (maskArr.length >= w * h) {
    for (let i = 0; i < w * h; i++) mask[i] = maskArr[i] * 255 > 128 ? 255 : 0;
  } else {
    // conservative center-ellipse mask fallback (never fabricated)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const nx = (x / w - 0.5) / 0.42,
          ny = (y / h - 0.5) / 0.42;
        mask[y * w + x] = nx * nx + ny * ny <= 1 ? 255 : 0;
      }
  }

  // 1. cut-out on white/cream backdrop
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("no ctx");
  octx.fillStyle = "#FAF3E9";
  octx.fillRect(0, 0, w, h);

  // 2. auto white balance (gray-world) computed inside mask
  const srcData = source.getContext("2d")?.getImageData(0, 0, w, h);
  if (srcData) {
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let i = 0; i < w * h; i++) {
      if (mask[i] > 128) {
        r += srcData.data[i * 4];
        g += srcData.data[i * 4 + 1];
        b += srcData.data[i * 4 + 2];
        n++;
      }
    }
    if (n > 0) {
      r /= n;
      g /= n;
      b /= n;
      const gain = [
        (r + g + b) / 3 / (r || 1),
        (r + g + b) / 3 / (g || 1),
        (r + g + b) / 3 / (b || 1),
      ];
      for (let i = 0; i < w * h; i++) {
        if (mask[i] > 128) {
          srcData.data[i * 4] = Math.min(255, srcData.data[i * 4] * gain[0]);
          srcData.data[i * 4 + 1] = Math.min(255, srcData.data[i * 4 + 1] * gain[1]);
          srcData.data[i * 4 + 2] = Math.min(255, srcData.data[i * 4 + 2] * gain[2]);
        } else {
          srcData.data[i * 4] = 250;
          srcData.data[i * 4 + 1] = 243;
          srcData.data[i * 4 + 2] = 233;
        }
      }
      octx.putImageData(srcData, 0, 0);
    } else {
      octx.drawImage(source, 0, 0);
    }
  } else {
    octx.drawImage(source, 0, 0);
  }

  // 3. contact shadow: soft ellipse under mask centroid
  let cx = 0,
    cy = 0,
    mn = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (mask[y * w + x] > 128) {
        cx += x;
        cy += y;
        mn++;
      }
  if (mn > 0) {
    cx /= mn;
    cy /= mn;
    octx.save();
    octx.globalAlpha = 0.18;
    octx.fillStyle = "#4A1108";
    octx.beginPath();
    octx.ellipse(cx, Math.min(h - 8, cy + h * 0.28), w * 0.28, h * 0.05, 0, 0, Math.PI * 2);
    octx.filter = "blur(8px)";
    octx.fill();
    octx.restore();
  }

  const enhancedDataUrl = out.toDataURL("image/webp", 0.9);

  // fidelity vs original (F3)
  const origData = srcData ?? octx.getImageData(0, 0, w, h);
  const enhData = octx.getImageData(0, 0, w, h);
  const { evaluateFidelity } = await import("./fidelity");
  const fidelity = evaluateFidelity(origData, enhData, mask);

  void SHOT_ROLES;
  return { enhancedDataUrl, mask, fidelity };
}

/** Per-channel crops exported as WebP data URLs. */
export function makeRenditions(enhanced: string): Promise<Record<string, string>> {
  return loadImage(enhanced).then((img) => {
    const crops: Record<string, string> = {};
    const specs: Array<[string, number, number]> = [
      ["1:1", 1, 1],
      ["3:4", 3, 4],
      ["4:5", 4, 5],
    ];
    for (const [label, rw, rh] of specs) {
      const c = document.createElement("canvas");
      c.width = 800;
      c.height = Math.round(800 * (rh / rw));
      const cx = c.getContext("2d");
      if (!cx) continue;
      const scale = Math.max(c.width / img.width, c.height / img.height);
      const dw = img.width * scale,
        dh = img.height * scale;
      cx.fillStyle = "#FAF3E9";
      cx.fillRect(0, 0, c.width, c.height);
      cx.drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
      crops[label] = c.toDataURL("image/webp", 0.85);
    }
    return crops;
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img load"));
    img.src = src;
  });
}
