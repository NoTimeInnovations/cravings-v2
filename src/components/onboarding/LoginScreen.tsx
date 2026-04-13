"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { getUserCountry, UserCountryInfo } from "@/lib/getUserCountry";

interface LoginScreenProps {
  storeName: string;
  storeBanner?: string;
  bgColor: string;
  accentColor: string;
  onContinue: (phone: string, countryInfo: UserCountryInfo) => void;
  loading?: boolean;
}

export default function LoginScreen({
  storeName,
  storeBanner,
  bgColor,
  accentColor,
  onContinue,
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
    <div className="flex flex-col min-h-dvh" style={{ backgroundColor: bgColor }}>
      {/* Top section with logo and food image */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8">
        {storeBanner ? (
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 mb-4">
            <Image
              src={storeBanner}
              alt={storeName}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mb-4 text-white text-3xl font-bold"
            style={{ backgroundColor: accentColor }}
          >
            {storeName?.charAt(0) || "M"}
          </div>
        )}
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: isDark(bgColor) ? "#fff" : "#111" }}
        >
          {storeName}
        </h1>
      </div>

      {/* Bottom white card */}
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-6 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <p className="text-gray-800 font-semibold text-base mb-5">
          Log in or sign up
        </p>

        {/* Phone input */}
        <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden h-12 mb-2">
          <div className="flex items-center gap-1.5 px-3 border-r border-gray-300 h-full bg-gray-50">
            <span className="text-sm font-medium text-gray-600">
              {countryInfo.callingCode}
            </span>
          </div>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="Enter Phone Number"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, "").slice(0, countryInfo.phoneDigits));
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="flex-1 h-full px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-white"
          />
        </div>

        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-12 rounded-xl text-white font-semibold text-sm mt-3 flex items-center justify-center transition-opacity disabled:opacity-60"
          style={{ backgroundColor: accentColor }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
        </button>

        <p className="text-[10px] text-gray-400 text-center mt-4 leading-relaxed">
          By continuing, you agree to our{" "}
          <span className="underline">Terms of Service</span>{" "}
          <span className="underline">Privacy Policy</span>{" "}
          <span className="underline">Content Policy</span>
        </p>
      </div>
    </div>
  );
}

function isDark(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}
