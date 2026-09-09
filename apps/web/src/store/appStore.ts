import { create } from "zustand";

interface AppState {
  language: string;
  setLanguage: (l: string) => void;
  online: boolean;
  setOnline: (v: boolean) => void;
  outboxCount: number;
  setOutboxCount: (n: number) => void;
  micListening: boolean;
  setMicListening: (v: boolean) => void;
  toast: { msg: string; actionLabel?: string; action?: () => void } | null;
  showToast: (msg: string, actionLabel?: string, action?: () => void) => void;
  clearToast: () => void;
  mlBackend: string;
  setMlBackend: (b: string) => void;
  modelCached: boolean;
  setModelCached: (v: boolean) => void;
  sessionCount: number;
  bumpSession: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  language: "hi",
  setLanguage: (language) => set({ language }),
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  setOnline: (online) => set({ online }),
  outboxCount: 0,
  setOutboxCount: (outboxCount) => set({ outboxCount }),
  micListening: false,
  setMicListening: (micListening) => set({ micListening }),
  toast: null,
  showToast: (msg, actionLabel, action) => set({ toast: { msg, actionLabel, action } }),
  clearToast: () => set({ toast: null }),
  mlBackend: "none",
  setMlBackend: (mlBackend) => set({ mlBackend }),
  modelCached: false,
  setModelCached: (modelCached) => set({ modelCached }),
  sessionCount: 0,
  bumpSession: () => set((s) => ({ sessionCount: s.sessionCount + 1 })),
}));
