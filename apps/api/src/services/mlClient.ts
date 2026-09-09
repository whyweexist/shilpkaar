// ML service client with cold-start awareness: shows "AI service waking up…" and retries with backoff.
const RAW_URL = process.env.ML_SERVICE_URL ?? "http://localhost:8000";
// Render's fromService wiring injects a bare hostname (no scheme); normalize so
// fetch() always gets an absolute URL in every environment.
const ML_URL = /^https?:\/\//i.test(RAW_URL) ? RAW_URL : `https://${RAW_URL}`;

export interface PriceInput {
  materialCost: number;
  daysOfWork: number;
  technique: string;
  material: string;
  region: string;
  season: string;
}

export interface PriceReason {
  factor: string;
  impact_inr: number;
  text_hi: string;
}

export interface PriceResult {
  floor: number;
  suggested: number;
  premium: number;
  confidence: number;
  reasons: PriceReason[];
  fallback?: boolean;
}

export async function mlPrice(input: PriceInput, timeoutMs = 8000): Promise<PriceResult> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${ML_URL}/price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.status === 503) {
        await delay(1500 * (attempt + 1));
        continue;
      } // cold start
      if (!res.ok) throw new Error(`ml ${res.status}`);
      return (await res.json()) as PriceResult;
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      await delay(1200 * (attempt + 1));
    }
  }
  throw lastErr ?? new Error("ml unreachable");
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
