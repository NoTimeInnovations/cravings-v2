"use client";

import { useState } from "react";

interface FontOption {
  value: string;
  label: string;
  className: string;
}

interface FontSelectProps {
  options: FontOption[];
  value: string;
  onChange: (value: string) => void;
}

export function FontSelect({ options, value, onChange }: FontSelectProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            className={`p-3 border rounded-lg text-left transition-all ${option.className} ${
              value === option.value
                ? "border-primary ring-2 ring-primary/20"
                : "border-muted hover:border-primary/40"
            }`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}