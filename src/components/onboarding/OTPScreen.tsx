"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

interface OTPScreenProps {
  phone: string;
  callingCode: string;
  storeBanner?: string;
  storeName: string;
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
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Logo */}
      <div className="flex justify-center pt-10 pb-6">
        {storeBanner ? (
          <div className="w-16 h-16 rounded-full overflow-hidden border border-[#E5E7EB] bg-white">
            <Image
              src={storeBanner}
              alt={storeName}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold bg-[#14532D]">
            {storeName?.charAt(0) || "M"}
          </div>
        )}
      </div>

      <div className="flex-1 px-6">
        <p className="text-[#4B5563] text-center text-sm mb-1">
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
          className="w-full h-14 text-center text-xl font-bold tracking-[0.4em] rounded-xl border-2 border-[#D1D5DB] bg-white outline-none transition-colors focus:border-[#6B7280] placeholder:text-[#D1D5DB] placeholder:tracking-[0.3em] text-[#111827]"
        />

        {error && (
          <p className="text-[#EF4444] text-xs text-center mt-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || otp.length < 6}
          className="w-full h-[50px] rounded-xl text-white font-semibold text-sm mt-6 flex items-center justify-center transition-opacity disabled:opacity-60 bg-[#F26522]"
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
            className="text-sm font-semibold text-[#F26522]"
          >
            Resend
          </button>
        </div>
      </div>
    </div>
  );
}
