"use client";

import { useRef, useCallback, KeyboardEvent, ClipboardEvent } from "react";

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
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  const focusInput = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, length - 1));
      inputRefs.current[clampedIndex]?.focus();
    },
    [length]
  );

  const handleChange = useCallback(
    (index: number, char: string) => {
      const digit = char.replace(/\D/g, "").slice(-1);
      if (!digit) return;

      const newValue = digits.map((d, i) => (i === index ? digit : d)).join("").replace(/ /g, "");
      onChange(newValue.slice(0, length));

      if (index < length - 1) {
        focusInput(index + 1);
      }
    },
    [digits, onChange, length, focusInput]
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        if (digits[index] && digits[index] !== " ") {
          const newValue = digits.map((d, i) => (i === index ? " " : d)).join("").trim();
          onChange(newValue);
        } else if (index > 0) {
          const newValue = digits.map((d, i) => (i === index - 1 ? " " : d)).join("").trim();
          onChange(newValue);
          focusInput(index - 1);
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        focusInput(index - 1);
      } else if (e.key === "ArrowRight" && index < length - 1) {
        focusInput(index + 1);
      }
    },
    [digits, onChange, length, focusInput]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      if (pasted) {
        onChange(pasted);
        focusInput(Math.min(pasted.length, length - 1));
      }
    },
    [onChange, length, focusInput]
  );

  const borderColor = accentColor || "#ea580c";

  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit === " " ? "" : digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 bg-transparent transition-all duration-200 outline-none disabled:opacity-50"
          style={{
            borderColor: digit && digit !== " " ? borderColor : "currentColor",
            opacity: digit && digit !== " " ? 1 : 0.2,
            color: "inherit",
          }}
        />
      ))}
    </div>
  );
}
