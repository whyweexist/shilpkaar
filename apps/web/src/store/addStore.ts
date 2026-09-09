import { create } from "zustand";

interface DraftShot {
  role: "front" | "back" | "texture" | "scale" | "maker";
  dataUrl: string;
  fidelity?: { deltaE: number; ssim: number; edgeIou: number; passed: boolean; mode: string };
}

interface AddDraft {
  shots: DraftShot[];
  transcript: string;
  repairedTranscript: string;
  repairs: Array<{ from: string; to: string }>;
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
  keywords: string[];
  attributes: Record<string, string>;
  materialCost: number;
  daysOfWork: number;
  price: {
    floor: number;
    suggested: number;
    premium: number;
    confidence: number;
    reasons: Array<{ factor: string; impact_inr: number; text_hi: string }>;
    fallback?: boolean;
  };
  channels: string[];
  startedAt: number;
  publishedAt?: number;
}

interface AddState {
  draft: AddDraft;
  setShots: (s: DraftShot[]) => void;
  addShot: (s: DraftShot) => void;
  removeShot: (role: DraftShot["role"]) => void;
  setTranscript: (
    t: string,
    repaired: string,
    repairs: Array<{ from: string; to: string }>,
  ) => void;
  setCopy: (
    c: Partial<
      Pick<
        AddDraft,
        | "titleEn"
        | "titleHi"
        | "descriptionEn"
        | "descriptionHi"
        | "keywords"
        | "attributes"
        | "materialCost"
        | "daysOfWork"
      >
    >,
  ) => void;
  setPrice: (p: AddDraft["price"]) => void;
  setChannels: (c: string[]) => void;
  reset: () => void;
}

const emptyDraft: AddDraft = {
  shots: [],
  transcript: "",
  repairedTranscript: "",
  repairs: [],
  titleEn: "",
  titleHi: "",
  descriptionEn: "",
  descriptionHi: "",
  keywords: [],
  attributes: {},
  materialCost: 300,
  daysOfWork: 2,
  price: { floor: 0, suggested: 0, premium: 0, confidence: 0, reasons: [] },
  channels: ["MICROSTORE", "WHATSAPP", "ONDC", "GEM"],
  startedAt: Date.now(),
};

export const useAddStore = create<AddState>((set) => ({
  draft: emptyDraft,
  setShots: (shots) => set((s) => ({ draft: { ...s.draft, shots } })),
  addShot: (shot) =>
    set((s) => ({
      draft: { ...s.draft, shots: [...s.draft.shots.filter((x) => x.role !== shot.role), shot] },
    })),
  removeShot: (role) =>
    set((s) => ({ draft: { ...s.draft, shots: s.draft.shots.filter((x) => x.role !== role) } })),
  setTranscript: (transcript, repairedTranscript, repairs) =>
    set((s) => ({ draft: { ...s.draft, transcript, repairedTranscript, repairs } })),
  setCopy: (c) => set((s) => ({ draft: { ...s.draft, ...c } })),
  setPrice: (price) => set((s) => ({ draft: { ...s.draft, price } })),
  setChannels: (channels) => set((s) => ({ draft: { ...s.draft, channels } })),
  reset: () => set({ draft: { ...emptyDraft, startedAt: Date.now() } }),
}));
