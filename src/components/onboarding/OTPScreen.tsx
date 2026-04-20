"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ChevronLeft } from "lucide-react";

interface OTPScreenProps {
  phone: string;
  callingCode: string;
  storeBanner?: string;
  storeName: string;
  themeBg?: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onChangeNumber: () => void;
  loading?: boolean;
  error?: string | null;
  accent?: string;
}

export default function OTPScreen({
  phone,
  callingCode,
  onVerify,
  onResend,
  onChangeNumber,
  loading,
  error,
  accent = "#1f2937",
}: OTPScreenProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newDigits.every((d) => d !== "")) {
      onVerify(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const newDigits = [...digits];
    for (let i = 0; i < text.length; i++) {
      newDigits[i] = text[i];
    }
    setDigits(newDigits);
    if (newDigits.every((d) => d !== "")) {
      onVerify(newDigits.join(""));
    }
  };

  const handleResend = () => {
    setCountdown(30);
    onResend();
  };

  const otp = digits.join("");
  const allFilled = digits.every((d) => d !== "");

  return (
    <div className="flex flex-col min-h-dvh bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif", paddingTop: 60 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 sticky top-0 z-10 bg-white">
        <button
          onClick={onChangeNumber}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 transition active:opacity-60"
        >
          <ChevronLeft className="w-[18px] h-[18px] text-gray-900" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Enter verification code
        </h1>
        <p className="mt-2.5 text-sm text-gray-500">
          Sent to <strong className="text-gray-900 font-medium">{callingCode}{phone}</strong>{" "}
          <span className="text-gray-900 font-medium cursor-pointer" onClick={onChangeNumber}>
            · Change
          </span>
        </p>

        {/* OTP boxes */}
        <div className="mt-9 flex gap-2.5 justify-between" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`flex-1 h-[58px] max-w-[50px] rounded-xl text-center text-2xl font-semibold text-gray-900 outline-none transition-all duration-150 ${
                d
                  ? "border-[1.5px] border-gray-900 bg-gray-50"
                  : "border-[1.5px] border-gray-200 bg-gray-50"
              } focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-xs text-center mt-3">{error}</p>
        )}

        {/* Resend */}
        <div className="mt-6 text-center text-[13px] text-gray-500">
          {countdown > 0 ? (
            <>Resend code in <strong className="text-gray-900 font-medium">{countdown}s</strong></>
          ) : (
            <button onClick={handleResend} className="text-gray-900 font-medium cursor-pointer">
              Resend code
            </button>
          )}
        </div>

        {/* Auto-detecting */}
        <div className="mt-10 flex items-center justify-center gap-2 text-gray-400 text-xs">
          <div className="w-3 h-3 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
          Auto-detecting SMS...
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="absolute left-0 right-0 bottom-0 px-4 pt-3.5 pb-8 bg-white/95 backdrop-blur-lg border-t border-gray-100 z-30">
        <button
          onClick={() => allFilled && onVerify(otp)}
          disabled={loading || !allFilled}
          className="w-full h-[52px] rounded-[14px] text-white font-semibold text-base flex items-center justify-center transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          style={{ backgroundColor: accent }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue"}
        </button>
      </div>
    </div>
  );
}
