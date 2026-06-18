import { create } from "zustand";

type UserPace = "slow" | "medium" | "fast";

type EmotionalMemoryStore = {
  viewedCareerIds: Set<string>;
  viewedCategoryIds: Set<string>;
  deepScrollCareerIds: Set<string>;
  reachedEmotionalNotesIds: Set<string>;
  hoveredCtaIds: Set<string>;
  pathwayFocus: Record<string, string[]>;
  userPace: UserPace;
  recordViewCareer: (id: string) => void;
  recordViewCategory: (id: string) => void;
  recordDeepScroll: (id: string) => void;
  recordReachedEmotionalNotes: (id: string) => void;
  recordHoveredCta: (id: string) => void;
  recordPathwayFocus: (careerId: string, stepId: string) => void;
  setUserPace: (pace: UserPace) => void;
};

export const useEmotionalMemory = create<EmotionalMemoryStore>((set) => ({
  viewedCareerIds: new Set(),
  viewedCategoryIds: new Set(),
  deepScrollCareerIds: new Set(),
  reachedEmotionalNotesIds: new Set(),
  hoveredCtaIds: new Set(),
  pathwayFocus: {},
  userPace: "medium",
  recordViewCareer: (id) =>
    set((s) => ({ viewedCareerIds: new Set(s.viewedCareerIds).add(id) })),
  recordViewCategory: (id) =>
    set((s) => ({ viewedCategoryIds: new Set(s.viewedCategoryIds).add(id) })),
  recordDeepScroll: (id) =>
    set((s) => ({
      deepScrollCareerIds: new Set(s.deepScrollCareerIds).add(id),
    })),
  recordReachedEmotionalNotes: (id) =>
    set((s) => ({
      reachedEmotionalNotesIds: new Set(s.reachedEmotionalNotesIds).add(id),
    })),
  recordHoveredCta: (id) =>
    set((s) => ({ hoveredCtaIds: new Set(s.hoveredCtaIds).add(id) })),
  recordPathwayFocus: (careerId, stepId) =>
    set((s) => ({
      pathwayFocus: {
        ...s.pathwayFocus,
        [careerId]: [...(s.pathwayFocus[careerId] ?? []), stepId],
      },
    })),
  setUserPace: (userPace) => set({ userPace }),
}));
