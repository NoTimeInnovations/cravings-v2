import { useEffect, useState, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import { useTourStore } from "@/store/tourStore";
import { TourOverlay } from "./TourOverlay";
import { TourTooltip } from "./TourTooltip";
import { DESKTOP_TOUR_STEPS, MOBILE_TOUR_STEPS } from "./tourSteps";

export function DashboardTour() {
  const { isActive, currentStep, direction, nextStep, previousStep, skipTour } =
    useTourStore();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Get current step configuration
  const steps = isMobile ? MOBILE_TOUR_STEPS : DESKTOP_TOUR_STEPS;
  const currentStepConfig = steps[currentStep];

  // Calculate target element position
  const updateTargetPosition = useCallback(() => {
    if (!isActive || !currentStepConfig) return;

    // Find all matching elements and get the first visible one
    const allTargets = document.querySelectorAll(
      currentStepConfig.selector
    ) as NodeListOf<HTMLElement>;

    let target: HTMLElement | null = null;
    for (const el of allTargets) {
      // Check if element is visible (not hidden by CSS)
      const styles = window.getComputedStyle(el);
      if (styles.display !== "none" && styles.visibility !== "hidden" && styles.opacity !== "0") {
        target = el;
        break;
      }
    }

    if (target) {
      // Scroll element into view if needed
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });

      // Wait for scroll to complete before getting rect
      setTimeout(() => {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
      }, 300);
    } else {
      // If target element not found, only auto-skip when moving forward
      // When going backward, stay on current step to avoid infinite loop
      if (direction === "forward") {
        console.warn(
          `Tour target not found: ${currentStepConfig.selector}. Skipping to next step.`
        );
        nextStep();
      } else {
        console.warn(
          `Tour target not found: ${currentStepConfig.selector}. Staying on current step.`
        );
        // Set a null rect to still show the tooltip without spotlight
        setTargetRect(null);
      }
    }
  }, [isActive, currentStepConfig, nextStep]);

  // Update position when step changes
  useEffect(() => {
    updateTargetPosition();
  }, [updateTargetPosition]);

  // Debounced resize handler
  useEffect(() => {
    if (!isActive) return;

    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateTargetPosition();
      }, 300);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, [isActive, updateTargetPosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          skipTour();
          break;
        case "ArrowRight":
        case "Enter":
          e.preventDefault();
          nextStep();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (currentStep > 0) {
            previousStep();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isActive, currentStep, nextStep, previousStep, skipTour]);

  if (!isActive || !currentStepConfig) {
    return null;
  }

  return (
    <AnimatePresence>
      {isActive && (
        <>
          <TourOverlay targetRect={targetRect} />
          <TourTooltip
            key="dashboard-tour-tooltip"
            step={currentStepConfig}
            stepNumber={currentStep + 1}
            totalSteps={steps.length}
            targetRect={targetRect}
            onNext={nextStep}
            onPrevious={previousStep}
            onSkip={skipTour}
          />
        </>
      )}
    </AnimatePresence>
  );
}
