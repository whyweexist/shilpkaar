interface Props {
  name: string;
  price: string;
  views: number;
  stockLabel: string;
  stockTone?: "ok" | "warn" | "danger";
  image: string;
  status: "Listed" | "Draft" | "Publishing…" | "Failed";
}

export function ProductCard({ name, price, views, stockLabel, image, status }: Props) {
  const pillStyles: Record<string, React.CSSProperties> = {
    Listed: { background: "var(--clr-cream-2)", color: "var(--clr-ink)" },
    Draft: { background: "#FFF3D6", color: "#8A5A00" },
    "Publishing…": { background: "var(--clr-terracotta)", color: "white" },
    Failed: { background: "var(--clr-danger)", color: "white" },
  };
  return (
    <div
      className="overflow-hidden rounded-[16px] bg-white"
      style={{ boxShadow: "var(--shadow-card)", border: "1px solid var(--clr-border)" }}
    >
      <div className="relative aspect-square overflow-hidden bg-[var(--clr-cream-2)]">
        <img src={image} alt={name} className="h-full w-full object-cover" loading="lazy" />
        <span
          className="absolute right-2 top-2 rounded-full px-2 py-1 text-[11px] font-semibold leading-none"
          style={pillStyles[status]}
        >
          {status}
        </span>
      </div>
      <div className="px-3 pb-3 pt-2">
        <p
          className="line-clamp-2 text-[14px] font-semibold leading-tight"
          style={{ color: "var(--clr-ink)" }}
        >
          {name}
        </p>
        <p className="mt-1 text-[15px] font-bold" style={{ color: "var(--clr-ink)" }}>
          {price}
        </p>
        <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--clr-ink-soft)" }}>
          {views} views •{" "}
          <span
            style={{
              color:
                stockLabel === "Low stock"
                  ? "var(--clr-warn)"
                  : stockLabel === "Out of stock"
                    ? "var(--clr-danger)"
                    : undefined,
            }}
          >
            {stockLabel}
          </span>
        </p>
      </div>
    </div>
  );
}
