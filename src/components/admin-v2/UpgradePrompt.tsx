"use client";

import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface UpgradePromptProps {
  variant?: "inline" | "overlay" | "card";
  feature?: string;
  description?: string;
}

export function UpgradePrompt({
  variant = "inline",
  feature = "This feature",
  description,
}: UpgradePromptProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push("/pricing");
  };

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg px-3 py-2">
        <Lock className="h-4 w-4 text-orange-600 shrink-0" />
        <span>{feature} is available on paid plans.</span>
        <Button
          variant="link"
          size="sm"
          className="text-orange-600 hover:text-orange-700 p-0 h-auto font-semibold"
          onClick={handleUpgrade}
        >
          Upgrade
        </Button>
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
        <div className="text-center space-y-3 p-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Lock className="h-6 w-6 text-orange-600" />
          </div>
          <h3 className="font-semibold text-lg">{feature}</h3>
          {description && (
            <p className="text-sm text-muted-foreground max-w-xs">
              {description}
            </p>
          )}
          <Button
            onClick={handleUpgrade}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Upgrade Plan
          </Button>
        </div>
      </div>
    );
  }

  // card variant
  return (
    <div className="flex flex-col items-center justify-center p-6 border border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/10 rounded-lg text-center space-y-3">
      <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
        <Lock className="h-6 w-6 text-orange-600" />
      </div>
      <h3 className="font-semibold">{feature}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      <Button
        onClick={handleUpgrade}
        className="bg-orange-600 hover:bg-orange-700 text-white"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Upgrade Plan
      </Button>
    </div>
  );
}
