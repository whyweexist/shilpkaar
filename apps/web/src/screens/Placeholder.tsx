interface Props {
  title: string;
  subtitle?: string;
}
export function Placeholder({ title, subtitle }: Props) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-[430px] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[22px] font-bold" style={{ color: "var(--clr-ink)" }}>
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-[14px]" style={{ color: "var(--clr-ink-soft)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
