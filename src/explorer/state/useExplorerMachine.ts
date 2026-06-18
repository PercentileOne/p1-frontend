import { create } from "zustand";
import metadata from "../../data/careers/metadata.json";

export type ExplorerMachineState =
  | "idle"
  | "enteringCategory"
  | "enteringSubcategory"
  | "enteringCareer"
  | "inCareer"
  | "exitingCareer";

type ExplorerMachineStore = {
  state: ExplorerMachineState;
  chapter: number;
  emotionalDepth: number;

  selectedCategoryId: string | null;
  selectedSubcategoryId: string | null;
  selectedCareerId: string | null;

  transitionTo: (state: ExplorerMachineState) => void;
  setChapter: (chapter: number) => void;
  setEmotionalDepth: (depth: number) => void;

  selectCategory: (id: string | null) => void;
  selectSubcategory: (id: string | null) => void;
  selectCareer: (id: string | null) => void;

  // NEW: explicit setter for careers
  setSelectedCareerId: (id: string | null) => void;
};

export const useExplorerMachine = create<ExplorerMachineStore>((set) => ({
  state: "idle",
  chapter: 1,
  emotionalDepth: 0,

  selectedCategoryId: null,
  selectedSubcategoryId: null,
  selectedCareerId: null,

  transitionTo: (state) => set({ state }),

  setChapter: (chapter) => set({ chapter }),

  setEmotionalDepth: (emotionalDepth) => set({ emotionalDepth }),

  // LEVEL 1 — CATEGORY
  selectCategory: (selectedCategoryId) =>
    set({
      selectedCategoryId,
      selectedSubcategoryId: null,
      selectedCareerId: null,
      state: "enteringCategory",
      emotionalDepth: 0,
      chapter: 1,
    }),

  // LEVEL 2 — SUBCATEGORY
  selectSubcategory: (selectedSubcategoryId) =>
    set({
      selectedSubcategoryId,
      selectedCareerId: null,
      state: "enteringSubcategory",
      emotionalDepth: 0,
      chapter: 1,
    }),

  // LEVEL 3 — CAREER
  selectCareer: (selectedCareerId) =>
    set({
      selectedCareerId,
      state: "enteringCareer",
      emotionalDepth: 0,
      chapter: 1,
    }),

  // Explicit setter for careers (used by SubcategoryCareerList)
  setSelectedCareerId: (id: string | null) =>
    set({
      selectedCareerId: id,
      state: "idle",
      emotionalDepth: 0,
      chapter: 1,
    }),
}));
