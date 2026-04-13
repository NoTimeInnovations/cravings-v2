"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion } from "motion/react";
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
  const loadedCount = useRef(0);

  const handleImageLoad = useCallback(() => {
    loadedCount.current += 1;
    if (loadedCount.current >= 3) {
      setImagesLoaded(true);
    }
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
        {/* items images collage */}
        <div className="relative w-full h-[100px] overflow-visible">
          {/* Dosa - left side */}
          <motion.div
            className="absolute -top-10 left-4 z-[2]"
            initial={{ y: -120, opacity: 0 }}
            animate={imagesLoaded ? { y: 0, opacity: 1 } : { y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
          >
            <Image
              src="/dosa.png"
              alt="Dosa"
              width={180}
              height={180}
              className="object-contain drop-shadow-lg -rotate-6"
              onLoad={handleImageLoad}
            />
          </motion.div>
          {/* Juice Jar - center, prominent */}
          <motion.div
            className="absolute -top-20 left-28 -translate-x-1/2 z-[3]"
            initial={{ y: -120, opacity: 0 }}
            animate={imagesLoaded ? { y: 0, opacity: 1 } : { y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
          >
            <Image
              src="/juice jar.png"
              alt="Juice Jar"
              width={200}
              height={200}
              className="object-contain drop-shadow-xl"
              onLoad={handleImageLoad}
            />
          </motion.div>
          {/* Biriyani - right side */}
          <motion.div
            className="absolute -top-10 right-8 z-[1]"
            initial={{ y: -120, opacity: 0 }}
            animate={imagesLoaded ? { y: 0, opacity: 1 } : { y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
          >
            <Image
              src="/biriyani.png"
              alt="Biriyani"
              width={180}
              height={180}
              className="object-contain drop-shadow-lg"
              onLoad={handleImageLoad}
            />
          </motion.div>
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
