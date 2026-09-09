import { create } from "zustand";

export interface AssistedProfile {
  id: string;
  name: string;
  pin: string;
  color: string;
}

interface AssistedState {
  profiles: AssistedProfile[];
  activeId: string;
  switchTo: (id: string) => void;
  addProfile: (p: AssistedProfile) => void;
}

const DEFAULT_PROFILES: AssistedProfile[] = [
  { id: "rajesh-001", name: "राजेश कुमार", pin: "1234", color: "#E0762F" },
  { id: "sunita-002", name: "सुनीता देवी", pin: "2345", color: "#2E9E5B" },
];

export const useAssistedStore = create<AssistedState>((set) => ({
  profiles: DEFAULT_PROFILES,
  activeId: "rajesh-001",
  switchTo: (activeId) => set({ activeId }),
  addProfile: (p) => set((s) => ({ profiles: [...s.profiles, p] })),
}));
