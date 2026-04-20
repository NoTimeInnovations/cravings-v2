import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { TourStep } from "./tourSteps";
import { useEffect, useState } from "react";

interface TourTooltipProps {
  step: TourStep;
  stepNumber: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

type Position = "top" | "bottom" | "left" | "right";

export function TourTooltip({
  step,
  stepNumber,
  totalSteps,
  targetRect,
  onNext,
  onPrevious,
  onSkip,
}: TourTooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [arrowPosition, setArrowPosition] = useState<Position>("bottom");
  const [tooltipRef, setTooltipRef] = useState<HTMLDivElement | null>(null);

  const isFirstStep = stepNumber === 1;
  const isLastStep = stepNumber === totalSteps;

  useEffect(() => {
    if (!tooltipRef) return;

    // If no target rect, center the tooltip on screen
    if (!targetRect) {
      const tooltipRect = tooltipRef.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      setPosition({
        top: (viewport.height - tooltipRect.height) / 2,
        left: (viewport.width - tooltipRect.width) / 2,
      });
      return;
    }

    const tooltipRect = tooltipRef.getBoundingClientRect();
    const spacing = 16;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Calculate available space in each direction
    const spaceAbove = targetRect.top;
    const spaceBelow = viewport.height - targetRect.bottom;
    const spaceLeft = targetRect.left;
    const spaceRight = viewport.width - targetRect.right;

    let top = 0;
    let left = 0;
    let finalPosition: Position = step.position || "bottom";

    // Determine best position based on available space
    if (
      step.position === "bottom" &&
      spaceBelow >= tooltipRect.height + spacing
    ) {
      finalPosition = "bottom";
      top = targetRect.bottom + spacing;
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    } else if (
      step.position === "top" &&
      spaceAbove >= tooltipRect.height + spacing
    ) {
      finalPosition = "top";
      top = targetRect.top - tooltipRect.height - spacing;
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    } else if (
      step.position === "right" &&
      spaceRight >= tooltipRect.width + spacing
    ) {
      finalPosition = "right";
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
      left = targetRect.right + spacing;
    } else if (
      step.position === "left" &&
      spaceLeft >= tooltipRect.width + spacing
    ) {
      finalPosition = "left";
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
      left = targetRect.left - tooltipRect.width - spacing;
    } else {
      // Fallback: choose position with most space
      if (spaceBelow >= tooltipRect.height + spacing) {
        finalPosition = "bottom";
        top = targetRect.bottom + spacing;
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      } else if (spaceAbove >= tooltipRect.height + spacing) {
        finalPosition = "top";
        top = targetRect.top - tooltipRect.height - spacing;
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      } else if (spaceRight >= tooltipRect.width + spacing) {
        finalPosition = "right";
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        left = targetRect.right + spacing;
      } else {
        finalPosition = "left";
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        left = targetRect.left - tooltipRect.width - spacing;
      }
    }

    // Ensure tooltip stays within viewport bounds
    left = Math.max(
      16,
      Math.min(left, viewport.width - tooltipRect.width - 16)
    );
    top = Math.max(
      16,
      Math.min(top, viewport.height - tooltipRect.height - 16)
    );

    setPosition({ top, left });
    setArrowPosition(finalPosition);
  }, [targetRect, tooltipRef, step.position]);

  return (
    <motion.div
      ref={setTooltipRef}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: 1,
        top: position.top,
        left: position.left,
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
        top: { duration: 0.4, ease: "easeInOut" },
        left: { duration: 0.4, ease: "easeInOut" },
        layout: { duration: 0.4, ease: "easeInOut" }
      }}
      className="fixed z-[9999] bg-background border rounded-lg shadow-xl p-4 sm:p-6 max-w-[320px] sm:max-w-[400px] pointer-events-auto"
    >
      <motion.div
        key={`step-${stepNumber}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="mb-4"
      >
        <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </motion.div>

      <div className="flex items-center justify-between gap-4">
        <motion.span
          key={`counter-${stepNumber}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground font-medium"
        >
          Step {stepNumber} of {totalSteps}
        </motion.span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip Tour
          </Button>
          {!isFirstStep && (
            <Button variant="outline" size="sm" onClick={onPrevious}>
              Back
            </Button>
          )}
          <Button size="sm" onClick={onNext}>
            {isLastStep ? "Finish" : "Next"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
