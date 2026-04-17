"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, ArrowLeft } from "lucide-react";
import { getUserCountry, UserCountryInfo } from "@/lib/getUserCountry";

interface LoginScreenProps {
  storeName: string;
  storeBanner?: string;
  themeBg?: string;
  storeTagline?: string;
  onContinue: (phone: string, countryInfo: UserCountryInfo) => void;
  loading?: boolean;
}

export default function LoginScreen({
  storeName,
  storeBanner,
  themeBg,
  storeTagline,
  onContinue,
  loading,
}: LoginScreenProps) {
  const tagline = storeTagline || `Order Your Favorite Dishes from ${storeName}`;
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
    <div className="flex flex-col min-h-dvh" style={{ backgroundColor: themeBg || '#14532D' }}>
      {/* Top section — tagline + image */}
      <div className="relative flex-1 min-h-[280px]">
        {/* Logo + Tagline — centered in top half */}
        <div className="absolute top-0 left-0 right-0 bottom-1/3 flex flex-col items-center justify-center px-6 z-10 gap-3">
          {storeBanner && (
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 bg-white shadow-lg">
              <Image
                src={storeBanner}
                alt={storeName}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h1 className="text-3xl font-black text-white leading-tight text-center line-clamp-3 capitalize">
            {tagline.toLowerCase()}
          </h1>
        </div>

        {/* Hero image — anchored to bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-[2]">
          <Image
            src="/loginscreenimage.png"
            alt="Food"
            width={600}
            height={400}
            className="w-full object-cover"
          />
        </div>
      </div>

      {/* Bottom white card */}
      <div className="bg-white rounded-t-3xl px-6 pt-10 pb-32 z-10 relative -mt-6">
          <p className="text-[#6a6a6a] font-medium text-center mb-5 text-sm">
            Log in or sign up
          </p>

          {/* Phone input */}
          <div className="flex items-center h-[50px] mb-2 gap-2">
            <div className="flex items-center gap-1.5 px-3 h-full border border-[#D6D6D6] rounded-xl shadow-sm shadow-black/20">
              <Image
                src={`https://flagcdn.com/w20/${countryInfo.countryCode.toLowerCase()}.png`}
                alt=""
                width={20}
                height={14}
                className="rounded-sm"
              />
              <span className="text-sm font-medium text-[#4B5563]">
                {countryInfo.callingCode}
              </span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Enter Phone Number"
              value={phone}
              onChange={(e) => {
                setPhone(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, countryInfo.phoneDigits),
                );
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="flex-1 h-full px-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none bg-white shadow-black/20 rounded-xl shadow-sm border border-[#D6D6D6]"
            />
          </div>

          {error && <p className="text-[#EF4444] text-xs mb-2">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-[50px] rounded-xl text-white font-semibold text-base mt-3 flex items-center justify-center transition-opacity disabled:opacity-60 bg-[#FF5301]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Continue"
            )}
          </button>

          <p className="text-[11px] text-[#9CA3AF] text-center mt-5 leading-relaxed">
            By continuing, you agree to our
            <br />
            <span className="underline">Terms of Service</span>
            {"  "}
            <span className="underline">Privacy Policy</span>
            {"  "}
            <span className="underline">Content Policy</span>
          </p>
      </div>
    </div>
  );
}
