"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Loader2, ArrowLeft } from "lucide-react";
import { getUserCountry, UserCountryInfo } from "@/lib/getUserCountry";

interface LoginScreenProps {
  storeName: string;
  storeBanner?: string;
  themeBg?: string;
  onContinue: (phone: string, countryInfo: UserCountryInfo) => void;
  loading?: boolean;
}

export default function LoginScreen({
  storeName,
  storeBanner,
  themeBg,
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
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImagesLoaded(true);
  }, []);

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
      {/* Top section with logo */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {storeBanner ? (
          <div className="w-24 h-24 rounded-[24px] overflow-hidden border-4 border-white/20 mb-4 bg-white">
            <Image
              src={storeBanner}
              alt={storeName}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-[60px] flex items-center justify-center mb-4 text-white text-3xl font-bold bg-[#1E6B3A]">
            {storeName?.charAt(0) || "M"}
          </div>
        )}
        <h1 className="text-2xl font-bold text-white mb-2 capitalize">
          {storeName?.toLowerCase()}
        </h1>
      </div>

      <div className="relative">
        {/* Hero image */}
        <div className="flex justify-center -mb-6 relative z-[2]">
          <div className={`opacity-0 ${imagesLoaded ? "animate-bounce-in-1" : ""}`}>
            <Image
              src="/loginscreenimage.png"
              alt="Food"
              width={320}
              height={220}
              className="object-contain drop-shadow-xl"
              onLoad={handleImageLoad}
            />
          </div>
        </div>

        {/* Bottom white card */}
        <div className="bg-white rounded-t-3xl px-6 pt-10 pb-32 z-10 relative">
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
    </div>
  );
}
