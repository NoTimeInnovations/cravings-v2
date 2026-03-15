"use client";

import { useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Crown, Check, PartyPopper } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";

type UpgradeSuccessModalProps = {
  open: boolean;
  onClose: () => void;
  planName: string;
  features?: string[];
};

function fireConfetti() {
  const end = Date.now() + 2500;

  // Initial burst
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#EA580C", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"],
  });

  // Continuous side cannons
  const frame = () => {
    if (Date.now() > end) return;

    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ["#EA580C", "#F59E0B", "#FBBF24"],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ["#EA580C", "#F59E0B", "#FBBF24"],
    });

    requestAnimationFrame(frame);
  };

  frame();
}

export function UpgradeSuccessModal({
  open,
  onClose,
  planName,
  features,
}: UpgradeSuccessModalProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");

  const triggerConfetti = useCallback(() => {
    fireConfetti();
  }, []);

  useEffect(() => {
    if (open) {
      // Small delay so modal is visible before confetti
      const timer = setTimeout(triggerConfetti, 300);
      return () => clearTimeout(timer);
    }
  }, [open, triggerConfetti]);

  if (!open) return null;

  const content = (
    <>
      <div className="flex flex-col items-center text-center">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-4 animate-[bounceIn_500ms_ease-out]">
          <PartyPopper className="h-8 w-8 text-white" />
        </div>

        <h2 className="text-xl font-bold text-foreground mb-1">
          Upgrade Successful!
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          You're now on the{" "}
          <span className="font-semibold text-orange-600 inline-flex items-center gap-1">
            <Crown className="h-3.5 w-3.5" />
            {planName}
          </span>{" "}
          plan
        </p>

        {features && features.length > 0 && (
          <div className="w-full rounded-lg border border-border bg-muted/30 p-4 mb-5 text-left">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              What you've unlocked
            </p>
            <div className="space-y-2">
              {features.slice(0, 5).map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 animate-[fadeInUp_300ms_ease-out_both]"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={onClose}
          className="w-full h-12 text-sm font-semibold rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
        >
          Go to Dashboard
        </Button>
      </div>

      <style jsx>{`
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 animate-[fadeIn_200ms_ease-out]" />

      {isDesktop ? (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 pointer-events-auto animate-[scaleIn_300ms_ease-out]">
            {content}
          </div>
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 z-10 animate-[slideUp_300ms_ease-out]">
          <div className="bg-background rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
            <div className="px-5 pb-6">{content}</div>
            <div className="h-safe-area-bottom" />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
