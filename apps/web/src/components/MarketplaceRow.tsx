import { ChevronRight, Store, Link2, ShoppingBag } from "lucide-react";

interface Channel {
  name: string;
  icon: React.ReactNode;
  status: string;
  tone: "success" | "warn";
}

const channels: Channel[] = [
  { name: "Amazon", icon: <Store size={18} />, status: "Synced • 8 products", tone: "success" },
  {
    name: "Flipkart",
    icon: <ShoppingBag size={18} />,
    status: "Synced • 5 products",
    tone: "success",
  },
  { name: "Meesho", icon: <Link2 size={18} />, status: "Pending sync • 0 products", tone: "warn" },
];

export function MarketplaceRow() {
  return (
    <div
      className="overflow-hidden rounded-[16px] bg-white"
      style={{ boxShadow: "var(--shadow-card)", border: "1px solid var(--clr-border)" }}
    >
      <div className="grid grid-cols-3 divide-x divide-[var(--clr-border)]">
        {channels.map((c) => (
          <button
            key={c.name}
            type="button"
            className="focus-ring flex flex-col items-start gap-1 px-3 py-3 text-left transition active:scale-[0.98]"
            style={{ minHeight: "72px" }}
          >
            <div className="flex w-full items-center justify-between">
              <span style={{ color: "var(--clr-ink)" }}>{c.icon}</span>
              <ChevronRight size={16} style={{ color: "var(--clr-ink-soft)" }} />
            </div>
            <span
              className="text-[13px] font-semibold leading-none"
              style={{ color: "var(--clr-ink)" }}
            >
              {c.name}
            </span>
            <span
              className="text-[11px] leading-tight"
              style={{ color: c.tone === "success" ? "var(--clr-success)" : "var(--clr-warn)" }}
            >
              {c.status}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
