"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, ChevronDown, ChevronLeft } from "lucide-react";
import { getUserCountry, UserCountryInfo } from "@/lib/getUserCountry";

interface LoginScreenProps {
  storeName: string;
  storeBanner?: string;
  themeBg?: string;
  storeTagline?: string;
  onContinue: (phone: string, countryInfo: UserCountryInfo) => void;
  onBack?: () => void;
  loading?: boolean;
}

export default function LoginScreen({
  storeName,
  storeBanner,
  storeTagline,
  onContinue,
  onBack,
  loading,
}: LoginScreenProps) {
  const [phone, setPhone] = useState("");
  const [countryInfo, setCountryInfo] = useState<UserCountryInfo>({
    country: "India",
    countryCode: "IN",
    phoneDigits: 10,
    callingCode: "+91",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    getUserCountry().then(setCountryInfo);
  }, []);

  const valid = phone.replace(/\D/g, "").length >= countryInfo.phoneDigits;

  const handleSubmit = () => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== countryInfo.phoneDigits) {
      setError(`Enter a valid ${countryInfo.phoneDigits}-digit number`);
      return;
    }
    setError("");
    onContinue(cleaned, countryInfo);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-white overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header with back button */}
      <div className="flex items-center gap-3 px-4 py-3.5 sticky top-0 z-10 bg-white">
        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 transition active:opacity-60"
          >
            <ChevronLeft className="w-[18px] h-[18px] text-gray-900" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-6 flex-1">
        <h1 className="text-[28px] font-semibold tracking-tight text-gray-900 leading-[1.15]">
          Welcome to <br />
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500 }}>
            {storeName}
          </span>
        </h1>
        <p className="mt-3 text-[15px] text-gray-500 leading-relaxed">
          Enter your mobile number to continue. We&apos;ll text you a one-time code.
        </p>

        {/* Phone input */}
        <div className="mt-8 flex gap-2 w-full max-w-full">
          <div className="h-[50px] rounded-xl border border-gray-200 bg-white flex items-center justify-center gap-1.5 shrink-0 px-3">
            <Image
              src={`https://flagcdn.com/w20/${countryInfo.countryCode.toLowerCase()}.png`}
              alt=""
              width={20}
              height={14}
              className="rounded-sm"
            />
            <span className="text-sm font-medium text-gray-900">{countryInfo.callingCode}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, "").slice(0, countryInfo.phoneDigits));
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="flex-1 min-w-0 h-[50px] px-3.5 rounded-xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition"
          />
        </div>

        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

        <p className="mt-3.5 text-xs text-gray-400 tracking-wide">
          Standard message rates may apply
        </p>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 left-0 right-0 px-4 pt-3.5 pb-8 bg-white/95 backdrop-blur-lg border-t border-gray-100 z-30 mt-auto">
        <button
          onClick={handleSubmit}
          disabled={loading || !valid}
          className="w-full h-[50px] rounded-[14px] bg-gray-900 text-white font-semibold text-[15px] flex items-center justify-center transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
        </button>
      </div>
    </div>
  );
}
