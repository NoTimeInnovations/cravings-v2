"use client";

import { useStorefrontStore } from "@/store/storefrontStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Eye, EyeOff, Plus, Palette, X } from "lucide-react";

const BUILTIN_NAMES: Record<string, string> = {
  hero: "Hero Banner",
  featured_items: "Featured Items",
  reviews: "Guest Reviews",
  about: "Our Story",
};

export function SectionList() {
  const {
    config,
    activeSectionId,
    setActiveSectionId,
    toggleSection,
    moveSectionUp,
    moveSectionDown,
    addCustomSection,
    removeSection,
  } = useStorefrontStore();

  return (
    <div className="flex flex-col">
      <div className="space-y-1">
        {config.sections.map((section, idx) => {
          const isActive = activeSectionId === section.id;
          const label =
            section.type === "custom"
              ? section.title || "Custom Section"
              : BUILTIN_NAMES[section.type];
          return (
            <div
              key={section.id}
              role="button"
              tabIndex={0}
              className={cn(
                "flex items-center gap-1 p-2 rounded-md cursor-pointer hover:bg-accent/50 transition-colors",
                isActive && "bg-accent",
                !section.enabled && "opacity-50",
              )}
              onClick={() => setActiveSectionId(section.id)}
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveSectionUp(section.id);
                  }}
                  disabled={idx === 0}
                  className="p-0.5 hover:bg-accent rounded disabled:opacity-20"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveSectionDown(section.id);
                  }}
                  disabled={idx === config.sections.length - 1}
                  className="p-0.5 hover:bg-accent rounded disabled:opacity-20"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSection(section.id);
                }}
                className="p-1 hover:bg-accent rounded"
                aria-label={section.enabled ? "Hide section" : "Show section"}
              >
                {section.enabled ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <span className="flex-1 text-sm font-medium truncate">{label}</span>
              {section.type === "custom" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSection(section.id);
                  }}
                  className="p-1 hover:bg-destructive/20 rounded"
                  aria-label="Delete section"
                >
                  <X className="h-3 w-3 text-destructive" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t space-y-1">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={addCustomSection}
          type="button"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Section
        </Button>
        <Button
          variant={activeSectionId === "__theme__" ? "secondary" : "ghost"}
          size="sm"
          className="w-full justify-start"
          onClick={() => setActiveSectionId("__theme__")}
          type="button"
        >
          <Palette className="h-4 w-4 mr-2" /> Theme & Colors
        </Button>
      </div>
    </div>
  );
}
