import { create } from "zustand";

type UIState = {
  reduceEffects: boolean;
  setReduceEffects: (v: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  reduceEffects: false,
  setReduceEffects: (v) => set({ reduceEffects: v }),
}));