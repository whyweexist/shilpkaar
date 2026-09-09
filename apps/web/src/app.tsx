import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./components/BottomNav";
import { Toast } from "./components/Toast";
import { useEffect, useState } from "react";
import { useAppStore } from "./store/appStore";
import { getOutboxCount } from "./db";
import { tryDrain } from "./lib/repo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export function App() {
  const location = useLocation();
  const { setOnline, outboxCount, setOutboxCount, toast, clearToast, bumpSession } = useAppStore();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    bumpSession();
    const sessions = Number(localStorage.getItem("sh_sessions") ?? 0) + 1;
    localStorage.setItem("sh_sessions", String(sessions));

    const syncChip = () => {
      void getOutboxCount().then(setOutboxCount);
    };
    syncChip();

    const onOutboxEvt = () => {
      void getOutboxCount().then(setOutboxCount);
    };
    const onOnline = () => {
      setOnline(true);
      void tryDrain();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("shilpkaar:outbox", onOutboxEvt);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const bipHandler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!standalone && sessions >= 2) setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", bipHandler as EventListener);

    // SW update toast — no silent reloads
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").then((reg) => {
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          nw?.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              useAppStore.getState().showToast("नया अपडेट तैयार है", "रीलोड", () => {
                void navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" });
                setTimeout(() => window.location.reload(), 300);
              });
            }
          });
        });
      });
      // iOS fallback drain: visibilitychange + message channel
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && navigator.onLine) void tryDrain();
      });
    }

    return () => {
      window.removeEventListener("shilpkaar:outbox", onOutboxEvt);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", bipHandler as EventListener);
    };
  }, [setOnline, setOutboxCount, bumpSession]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    setShowInstall(false);
  };

  const isIOS = /iphone|ipad/i.test(navigator.userAgent);

  const hideNav = location.pathname.startsWith("/add/") && location.pathname !== "/add";

  return (
    <div className="app-shell-bg flex min-h-screen justify-center">
      <div className="relative flex min-h-screen w-full max-w-[430px] flex-col bg-[var(--clr-cream)] shadow-[0_0_40px_rgba(74,17,8,0.08)]">
        {showInstall && !isIOS && (
          <div
            className="mx-3 mt-3 flex items-center justify-between rounded-[16px] bg-white px-4 py-3"
            style={{ boxShadow: "var(--shadow-card)", border: "1px solid var(--clr-border)" }}
          >
            <div>
              <p className="text-[14px] font-semibold" style={{ color: "var(--clr-ink)" }}>
                शिल्पkaar इंस्टॉल करें
              </p>
              <p className="text-[12px]" style={{ color: "var(--clr-ink-soft)" }}>
                होम स्क्रीन पर जोड़ें — बिना इंटरनेट भी
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="focus-ring rounded-full px-4 py-2 text-[13px] font-semibold text-white"
              style={{ background: "var(--clr-terracotta)" }}
            >
              Install
            </button>
          </div>
        )}
        {showInstall && isIOS && (
          <div
            className="mx-3 mt-3 rounded-[16px] bg-white px-4 py-3 text-[13px]"
            style={{
              boxShadow: "var(--shadow-card)",
              border: "1px solid var(--clr-border)",
              color: "var(--clr-ink)",
            }}
          >
            <b>iOS: Add to Home Screen</b> — नीचे <b>Share</b> ⓘ icon → <b>Add to Home Screen</b> →
            Add. ऐप फिर ऑफ़लाइन भी चलेगा।
          </div>
        )}

        <main className="flex-1">
          <Outlet />
        </main>

        {!hideNav && <BottomNav />}

        <button
          aria-label="Voice help"
          className="focus-ring fixed z-30 flex h-12 w-12 items-center justify-center rounded-full text-white"
          style={{
            bottom: "calc(var(--nav-h) + 28px + env(safe-area-inset-bottom))",
            right: "max(16px, calc(50% - 215px + 16px))",
            background: `radial-gradient(120% 120% at 30% 20%, var(--clr-terracotta-lt) 0%, var(--clr-terracotta) 65%)`,
            boxShadow: "var(--shadow-glow)",
          }}
          onClick={() => {
            if (location.pathname !== "/add") window.location.assign("/add");
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
            <path d="M19 10a7 7 0 0 1-14 0" />
            <path d="M12 19v3" />
          </svg>
        </button>

        <Toast toast={toast} onClose={clearToast} />
        <span className="sr-only" aria-live="polite">
          {outboxCount} items waiting to sync
        </span>
      </div>
    </div>
  );
}
