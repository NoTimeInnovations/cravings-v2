import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface TourStore {
  hasSeenDashboardTour: boolean;
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  direction: "forward" | "backward";
  startTour: (totalSteps: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
}

export const useTourStore = create<TourStore>()(
  persist(
    (set, get) => ({
      hasSeenDashboardTour: false,
      isActive: false,
      currentStep: 0,
      totalSteps: 0,
      direction: "forward",

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
          // Last step - complete the tour
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
        set({
          isActive: false,
          hasSeenDashboardTour: true,
          currentStep: 0,
        });
      },

      completeTour: () => {
        set({
          isActive: false,
          hasSeenDashboardTour: true,
          currentStep: 0,
        });
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
    }),
    {
      name: "dashboard-tour-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hasSeenDashboardTour: state.hasSeenDashboardTour,
      }),
    }
  )
);
