"use client";

import { useRef, useEffect } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  accentColor?: string;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true,
  accentColor,
}: OtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (inputValue: string) => {
    const cleaned = inputValue.replace(/\D/g, "").slice(0, length);
    onChange(cleaned);
  };

  const borderColor = accentColor || "#ea580c";

  return (
    <div className="flex justify-center">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={"•".repeat(length)}
        maxLength={length}
        className="w-full max-w-[280px] h-14 text-center text-2xl sm:text-3xl font-bold rounded-xl border-2 bg-transparent transition-all duration-200 outline-none disabled:opacity-50 tracking-[0.5em]"
        style={{
          borderColor: value.length > 0 ? borderColor : "currentColor",
          opacity: value.length > 0 ? 1 : 0.4,
          color: "inherit",
        }}
      />
    </div>
  );
}
