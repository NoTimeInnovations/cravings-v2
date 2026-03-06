import { create } from "zustand";
import { updatePartner } from "@/api/partners";

interface TourStore {
  hasSeenDashboardTour: boolean;
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  direction: "forward" | "backward";
  _partnerId: string | null;
  initFromDb: (partnerId: string, hasSeen: boolean) => void;
  startTour: (totalSteps: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
}

const markSeenInDb = (partnerId: string | null) => {
  if (!partnerId) return;
  updatePartner(partnerId, { has_seen_tour: true }).catch((err) =>
    console.error("Failed to save tour status:", err)
  );
};

export const useTourStore = create<TourStore>()((set, get) => ({
  hasSeenDashboardTour: false,
  isActive: false,
  currentStep: 0,
  totalSteps: 0,
  direction: "forward",
  _partnerId: null,

  initFromDb: (partnerId: string, hasSeen: boolean) => {
    set({
      _partnerId: partnerId,
      hasSeenDashboardTour: !!hasSeen,
    });
  },

  startTour: (totalSteps: number) => {
    set({
      isActive: true,
      currentStep: 0,
      totalSteps,
      direction: "forward",
    });
  },

  nextStep: () => {
    const { currentStep, totalSteps } = get();
    if (currentStep < totalSteps - 1) {
      set({ currentStep: currentStep + 1, direction: "forward" });
    } else {
      get().completeTour();
    }
  },

  previousStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1, direction: "backward" });
    }
  },

  skipTour: () => {
    const { _partnerId } = get();
    set({
      isActive: false,
      hasSeenDashboardTour: true,
      currentStep: 0,
    });
    markSeenInDb(_partnerId);
  },

  completeTour: () => {
    const { _partnerId } = get();
    set({
      isActive: false,
      hasSeenDashboardTour: true,
      currentStep: 0,
    });
    markSeenInDb(_partnerId);
  },

  resetTour: () => {
    set({
      hasSeenDashboardTour: false,
      isActive: false,
      currentStep: 0,
      totalSteps: 0,
      direction: "forward",
    });
  },
}));
