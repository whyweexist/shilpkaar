const API_BASE =
  (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_API_URL ?? "";

export class ApiError extends Error {
  code: string;
  messageHi: string;
  retryable: boolean;
  status: number;
  constructor(
    code: string,
    message: string,
    messageHi: string,
    retryable: boolean,
    status: number,
  ) {
    super(message);
    this.code = code;
    this.messageHi = messageHi;
    this.retryable = retryable;
    this.status = status;
  }
}

async function parseErr(res: Response): Promise<ApiError> {
  try {
    const j = (await res.json()) as {
      code?: string;
      message?: string;
      messageHi?: string;
      retryable?: boolean;
    };
    return new ApiError(
      j.code ?? "ERR",
      j.message ?? res.statusText,
      j.messageHi ?? "सर्वर में समस्या",
      j.retryable ?? res.status >= 500,
      res.status,
    );
  } catch {
    return new ApiError("NET", "Network unreachable", "नेटवर्क नहीं मिला", true, 0);
  }
}

export async function apiGet<T>(path: string, timeoutMs = 6000): Promise<T> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api${path}`, { signal: c.signal });
    if (!res.ok) throw await parseErr(res);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  idempotencyKey?: string,
  retries = 2,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  let lastErr: unknown = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`${API_BASE}/api${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (res.status === 503 || res.status === 502) {
        await new Promise((r) => setTimeout(r, 1200 * (i + 1))); // cold start backoff
        continue;
      }
      if (!res.ok) throw await parseErr(res);
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr ?? new ApiError("NET", "unreachable", "नेटवर्क नहीं मिला", true, 0);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErr(res);
  return (await res.json()) as T;
}
