import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  footer?: ReactNode;
}

export function StatCard({ icon, label, value, delta, deltaPositive = true, footer }: Props) {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col rounded-[16px] bg-white p-[14px]"
      style={{ boxShadow: "var(--shadow-card)", border: "1px solid var(--clr-border)" }}
    >
      <div
        className="flex items-center gap-[6px] text-[11.5px] font-medium"
        style={{ color: "var(--clr-ink-soft)" }}
      >
        <span
          className="text-terracotta flex h-4 w-4 items-center justify-center"
          style={{ color: "var(--clr-terracotta)" }}
        >
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>
      <div
        className="mt-1 truncate text-[24px] font-bold leading-none"
        style={{ color: "var(--clr-ink)" }}
      >
        {value}
      </div>
      {delta ? (
        <div
          className="mt-1 flex items-center gap-1 text-[11.5px] font-medium"
          style={{ color: deltaPositive ? "var(--clr-success)" : "var(--clr-warn)" }}
        >
          <span aria-hidden>{deltaPositive ? "↑" : "↓"}</span>
          <span>{delta}</span>
        </div>
      ) : footer ? (
        <div className="mt-1">{footer}</div>
      ) : null}
    </div>
  );
}
