import { Link } from "react-router-dom";

interface Props {
  title: string;
  href?: string;
  actionLabel?: string;
}

export function SectionHeader({ title, href = "/products", actionLabel = "See all →" }: Props) {
  return (
    <div className="flex items-center justify-between">
      <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--clr-ink)" }}>{title}</h2>
      <Link
        to={href}
        className="focus-ring text-[13px] font-semibold"
        style={{ color: "var(--clr-terracotta)" }}
      >
        {actionLabel}
      </Link>
    </div>
  );
}
