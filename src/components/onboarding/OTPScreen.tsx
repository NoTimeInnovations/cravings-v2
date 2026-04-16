"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

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
}

export default function OTPScreen({
  phone,
  callingCode,
  storeBanner,
  storeName,
  themeBg,
  onVerify,
  onResend,
  onChangeNumber,
  loading,
  error,
}: OTPScreenProps) {
  const [otp, setOtp] = useState("");

  const handleSubmit = () => {
    if (otp.length < 6) return;
    onVerify(otp);
  };

  return (
    <div className="flex flex-col min-h-dvh" style={{ backgroundColor: themeBg || '#14532D' }}>
      {/* Top section with logo only */}
      <div className="flex flex-col items-center justify-center px-6 pt-12 pb-8">
        {storeBanner ? (
          <div className="w-20 h-20 rounded-[20px] overflow-hidden border-4 border-white/20 bg-white">
            <Image
              src={storeBanner}
              alt={storeName}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-[20px] flex items-center justify-center text-white text-2xl font-bold bg-[#1E6B3A]">
            {storeName?.charAt(0) || "M"}
          </div>
        )}
      </div>

      {/* White card taking most of the screen */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-10 pb-8">
        <p className="text-[#6a6a6a] font-medium text-center text-sm mb-1">
          Enter the OTP send to
        </p>
        <p className="text-[#111827] text-center font-bold text-base mb-8">
          {callingCode}{phone}
        </p>

        {/* OTP Input */}
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="XXXXXX"
          maxLength={6}
          className="w-full h-[50px] text-center text-sm font-bold tracking-[0.4em] px-3 text-[#111827] placeholder:text-[#9CA3AF] placeholder:tracking-[0.3em] outline-none bg-white shadow-black/20 rounded-xl shadow-sm border border-[#D6D6D6]"
        />

        {error && (
          <p className="text-[#EF4444] text-xs text-center mt-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || otp.length < 6}
          className="w-full h-[50px] rounded-xl text-white font-semibold text-base mt-6 flex items-center justify-center transition-opacity disabled:opacity-60 bg-[#FF5301]"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
        </button>

        {/* Bottom links */}
        <div className="flex items-center justify-between mt-5">
          <button
            onClick={onChangeNumber}
            className="text-sm text-[#6B7280]"
          >
            Change number ?
          </button>
          <button
            onClick={onResend}
            className="text-sm font-semibold text-[#FF5301]"
          >
            Resend
          </button>
        </div>
      </div>
    </div>
  );
}
