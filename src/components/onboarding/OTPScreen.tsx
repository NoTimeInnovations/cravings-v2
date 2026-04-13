"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

interface OTPScreenProps {
  phone: string;
  callingCode: string;
  storeBanner?: string;
  storeName: string;
  accentColor: string;
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
  accentColor,
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
          <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200">
            <Image
              src={storeBanner}
              alt={storeName}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: accentColor }}
          >
            {storeName?.charAt(0) || "M"}
          </div>
        )}
      </div>

      <div className="flex-1 px-6">
        <p className="text-gray-700 text-center text-sm mb-1">
          Enter the OTP send to
        </p>
        <p className="text-gray-900 text-center font-semibold text-base mb-8">
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
          className="w-full h-14 text-center text-xl font-bold tracking-[0.4em] rounded-xl border-2 border-gray-300 bg-white outline-none transition-colors focus:border-gray-500 placeholder:text-gray-300 placeholder:tracking-[0.3em]"
        />

        {error && (
          <p className="text-red-500 text-xs text-center mt-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || otp.length < 6}
          className="w-full h-12 rounded-xl text-white font-semibold text-sm mt-6 flex items-center justify-center transition-opacity disabled:opacity-60"
          style={{ backgroundColor: accentColor }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
        </button>

        {/* Bottom links */}
        <div className="flex items-center justify-between mt-5">
          <button
            onClick={onChangeNumber}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Change number ?
          </button>
          <button
            onClick={onResend}
            className="text-sm font-semibold"
            style={{ color: accentColor }}
          >
            Resend
          </button>
        </div>
      </div>
    </div>
  );
}
