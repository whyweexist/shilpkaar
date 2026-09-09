interface Props {
  toast: { msg: string; actionLabel?: string; action?: () => void } | null;
  onClose: () => void;
}

export function Toast({ toast, onClose }: Props) {
  if (!toast) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 z-50 mx-auto mt-3 flex max-w-[400px] items-center justify-between gap-3 rounded-[16px] px-4 py-3"
      style={{
        top: "calc(env(safe-area-inset-top) + 8px)",
        background: "var(--clr-ink)",
        color: "var(--clr-on-maroon)",
        boxShadow: "var(--shadow-raise)",
      }}
    >
      <span className="text-[14px] font-medium">{toast.msg}</span>
      {toast.actionLabel && (
        <button
          onClick={() => {
            toast.action?.();
            onClose();
          }}
          className="focus-ring rounded-full px-3 py-1.5 text-[13px] font-bold"
          style={{ background: "var(--clr-terracotta)", color: "white" }}
        >
          {toast.actionLabel}
        </button>
      )}
      <button
        aria-label="Close"
        onClick={onClose}
        className="focus-ring ml-1 min-h-[44px] min-w-[44px] text-[16px]"
      >
        ✕
      </button>
    </div>
  );
}
