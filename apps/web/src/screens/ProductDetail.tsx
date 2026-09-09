import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../db";
import type { DexieProduct } from "../db";
import { speak } from "../ml/tts";
import { apiGet } from "../lib/api";
import { ChevronLeft, Plus, Minus, Pause, Play, Mic } from "lucide-react";

interface ChannelRow {
  channel: string;
  eligible: boolean;
  blockers: string[];
}

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [p, setP] = useState<DexieProduct | null>(null);
  const [channels, setChannels] = useState<ChannelRow[]>([]);

  useEffect(() => {
    void db.products.get(id ?? "").then((row) => {
      setP(row ?? null);
      if (row) speak(`${row.titleHi}, कीमत ${row.price} रुपये`);
    });
    void apiGet<{ eligibility: ChannelRow[] }>(`/products/${id}/channels`)
      .then((r) => setChannels(r.eligibility))
      .catch(() => setChannels([]));
  }, [id]);

  if (!p) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p style={{ color: "var(--clr-ink-soft)" }}>उत्पाद नहीं मिला</p>
      </div>
    );
  }

  async function adjustStock(delta: number): Promise<void> {
    const next = Math.max(0, p ? p.stock + delta : 0);
    await db.products.update(p!.id, { stock: next });
    setP({ ...p!, stock: next });
    speak(`स्टॉक अब ${next} है`);
  }

  async function togglePause(): Promise<void> {
    const next = p!.status === "LIVE" ? "PAUSED" : "LIVE";
    await db.products.update(p!.id, { status: next });
    setP({ ...p!, status: next });
    speak(next === "PAUSED" ? "बिक्री रोक दी" : "बिक्री फिर शुरू");
  }

  return (
    <div className="pb-[calc(var(--nav-h)+24px+env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          onClick={() => navigate("/products")}
          className="focus-ring min-h-[56px] min-w-[56px] text-[var(--clr-ink)]"
          aria-label="Back"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={() => speak("बोलें — क्या बदलना है? कीमत, नाम, या फोटो?")}
          className="focus-ring flex min-h-[48px] items-center gap-1 rounded-full px-4 text-[13px] font-bold text-white"
          style={{ background: "var(--clr-terracotta)" }}
        >
          <Mic size={16} /> बोलकर बदलें
        </button>
      </header>

      <div
        className="mx-[18px] mt-3 overflow-hidden rounded-[20px] bg-white"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <img src={p.imageUrl} alt={p.titleHi} className="aspect-square w-full object-cover" />
        <div className="p-4">
          <h1 className="text-[20px] font-bold" style={{ color: "var(--clr-ink)" }}>
            {p.titleHi}
          </h1>
          <p className="text-[13px]" style={{ color: "var(--clr-ink-soft)" }}>
            {p.titleEn}
          </p>
          <div className="mt-2 text-[24px] font-bold" style={{ color: "var(--clr-ink)" }}>
            ₹{p.price.toLocaleString("en-IN")}
          </div>
          <p className="mt-1 text-[12px]" style={{ color: "var(--clr-ink-soft)" }}>
            {p.views} views • {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
          </p>
        </div>
      </div>

      <div className="mx-[18px] mt-4 flex gap-3">
        <button
          onClick={() => void adjustStock(1)}
          className="focus-ring flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-[16px] bg-white text-[14px] font-semibold"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <Plus size={18} /> स्टॉक
        </button>
        <button
          onClick={() => void adjustStock(-1)}
          className="focus-ring flex min-h-[56px] items-center justify-center rounded-[16px] bg-white"
          style={{ boxShadow: "var(--shadow-card)", color: "var(--clr-ink)" }}
        >
          <Minus size={18} />
        </button>
        <button
          onClick={() => void togglePause()}
          className="focus-ring flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-[16px] text-[14px] font-semibold text-white"
          style={{ background: p.status === "LIVE" ? "var(--clr-warn)" : "var(--clr-success)" }}
        >
          {p.status === "LIVE" ? (
            <>
              <Pause size={18} /> रोकें
            </>
          ) : (
            <>
              <Play size={18} /> चालू
            </>
          )}
        </button>
      </div>

      <div className="mx-[18px] mt-4">
        <h2 className="text-[16px] font-bold" style={{ color: "var(--clr-ink)" }}>
          चैनल स्थिति
        </h2>
        <div className="mt-2 flex flex-col gap-2">
          {channels.length === 0 && (
            <p className="text-[13px]" style={{ color: "var(--clr-ink-soft)" }}>
              ऑफ़लाइन — ऑनलाइन आने पर दिखेगा
            </p>
          )}
          {channels.map((c) => (
            <div
              key={c.channel}
              className="flex items-center justify-between rounded-[12px] bg-white px-4 py-3"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <span className="text-[14px] font-semibold" style={{ color: "var(--clr-ink)" }}>
                {c.channel}
              </span>
              <span
                className="text-[12px]"
                style={{ color: c.eligible ? "var(--clr-success)" : "var(--clr-warn)" }}
              >
                {c.eligible ? "✓ योग्य" : c.blockers[0]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
