import { useMemo } from "react";

interface Props {
  name: string;
  avatarUrl?: string;
}

function greetingForHour(h: number, lang: string): string {
  if (lang === "hi") {
    if (h < 12) return "सुप्रभात";
    if (h < 17) return "नमस्कार";
    return "शुभ संध्या";
  }
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export function AppHeader({ name, avatarUrl }: Props) {
  const greeting = useMemo(() => greetingForHour(new Date().getHours(), "hi"), []);
  return (
    <header
      className="relative w-full overflow-hidden px-[18px] pb-8 pt-[calc(14px+env(safe-area-inset-top))]"
      style={{
        background: `linear-gradient(180deg, var(--clr-maroon-900) 0%, var(--clr-maroon-800) 55%, var(--clr-maroon-700) 100%)`,
        borderBottomLeftRadius: "var(--r-xl)",
        borderBottomRightRadius: "var(--r-xl)",
        minHeight: "150px",
      }}
    >
      {/* top row: brand + avatar */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* kalash badge */}
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{ border: "1.5px solid var(--clr-gold)", background: "rgba(242,193,133,0.12)" }}
            aria-hidden
          >
            {/* simple kalash line-art */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--clr-gold)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 10a4 4 0 0 1 8 0c0 2-1.2 3.2-2.5 4.2L12 16l-1.5-1.8C9.2 13.2 8 12 8 10Z" />
              <path d="M9 7h6" />
              <ellipse cx="12" cy="7" rx="3" ry="1.2" />
              <path d="M10 16h4" />
              <path d="M9 18h6" />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-[2px] leading-none">
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "30px",
                  fontWeight: 700,
                  color: "var(--clr-gold)",
                  letterSpacing: "-0.02em",
                }}
              >
                शिल्प
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "30px",
                  fontWeight: 300,
                  color: "var(--clr-on-maroon)",
                  letterSpacing: "-0.02em",
                }}
              >
                kaar
              </span>
            </div>
            <p
              className="mt-[2px] uppercase"
              style={{
                fontSize: "11px",
                letterSpacing: "0.06em",
                color: "rgba(242,193,133,0.7)",
                fontWeight: 500,
              }}
            >
              Artisan Business Manager
            </p>
          </div>
        </div>

        <div className="relative">
          <img
            src={
              avatarUrl ??
              "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face&auto=format"
            }
            alt={`${name} avatar`}
            className="h-[52px] w-[52px] rounded-full object-cover"
            style={{ border: "2px solid var(--clr-gold)" }}
          />
          <span
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full"
            style={{ background: "var(--clr-success)", border: "2px solid white" }}
            aria-label="online"
          />
        </div>
      </div>

      {/* greeting block */}
      <div
        className="mt-5 rounded-[16px] px-4 py-3"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--clr-on-maroon)",
            lineHeight: 1.1,
          }}
        >
          नमस्ते, {name}!
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(242,193,133,0.8)", marginTop: "4px" }}>
          {greeting} • Let&apos;s grow your craft today
        </p>
      </div>
    </header>
  );
}
