"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { ButtonV2 } from "@/components/ui/ButtonV2";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Notification } from "@/app/actions/notification";
import {
  getUserCountry,
  validatePhoneNumber,
  getPhoneValidationError,
  UserCountryInfo,
} from "@/lib/getUserCountry";
import { useDomain } from "@/providers/DomainProvider";

type LoginMode = "user" | "partner";
export default function Login() {
  const appName = "Menuthere";
  const { signInWithPhone, signInPartnerWithEmail } = useAuthStore();
  const navigate = useRouter();
  const [mode, setMode] = useState<LoginMode>("partner");
  const [isLoading, setIsLoading] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [userCountryInfo, setUserCountryInfo] =
    useState<UserCountryInfo | null>(null);
  const [partnerData, setPartnerData] = useState({
    email: "",
    password: "",
  });

  // Fetch user country info on mount
  useEffect(() => {
    getUserCountry().then((info) => {
      setUserCountryInfo(info);
    });
  }, []);

  const handleUserSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userCountryInfo) {
      toast.error("Unable to detect your country. Please try again.");
      return;
    }

    // Remove +91 or country code if present
    const cleanedPhone = userPhone.replace(/^\+\d+/, "");

    if (!validatePhoneNumber(cleanedPhone, userCountryInfo.countryCode)) {
      toast.error(getPhoneValidationError(userCountryInfo.countryCode));
      return;
    }

    setIsLoading(true);
    try {
      await signInWithPhone(cleanedPhone, undefined, userCountryInfo);
      await Notification.token.save();
      const redirectPath = localStorage?.getItem("redirectPath");
      if (redirectPath) {
        localStorage?.removeItem("redirectPath");
        navigate.push(redirectPath);
      } else {
        navigate.push("/explore");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in");
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePartnerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const partner = await signInPartnerWithEmail(
        partnerData.email,
        partnerData.password,
      );
      await Notification.token.save();

      if (partner && partner.subscription_details) {
        navigate.push("/admin-v2");
      } else {
        navigate.push("/admin");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in");
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-xl p-5 sm:p-8">
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <Image
            src="/menuthere-logo.png"
            alt="Menuthere"
            width={48}
            height={48}
            className="h-10 w-10 sm:h-12 sm:w-12 object-contain mb-3"
          />
          <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900 text-center">
            Welcome to Menuthere
          </h1>
        </div>

        <div className="flex gap-2 mb-6">
          <ButtonV2
            variant={mode === "partner" ? "primary" : "secondary"}
            onClick={() => setMode("partner")}
            showArrow={false}
            className="flex-1 justify-center"
          >
            Partner
          </ButtonV2>
          <ButtonV2
            variant={mode === "user" ? "primary" : "secondary"}
            onClick={() => setMode("user")}
            showArrow={false}
            className="flex-1 justify-center"
          >
            User
          </ButtonV2>
        </div>

        {mode === "user" ? (
          <form onSubmit={handleUserSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm text-stone-700">
                Phone Number
              </Label>
              <div className="flex gap-2">
                {userCountryInfo && (
                  <div className="flex items-center px-4 bg-stone-50 rounded-xl text-sm font-medium text-stone-600 shrink-0 border border-stone-200">
                    {userCountryInfo.callingCode}
                  </div>
                )}
                <Input
                  id="phone"
                  type="tel"
                  placeholder={
                    userCountryInfo
                      ? `${userCountryInfo.phoneDigits}-digit number`
                      : "Phone number"
                  }
                  value={userPhone}
                  onChange={(e) => {
                    const maxDigits = userCountryInfo?.phoneDigits || 10;
                    setUserPhone(
                      e.target.value.replace(/\D/g, "").slice(0, maxDigits),
                    );
                  }}
                  required
                  className="flex-1 min-w-0 h-11 rounded-xl border-stone-200 bg-stone-50 px-4 text-stone-900 placeholder:text-stone-400 focus-visible:ring-[#B5581A]/30 focus-visible:border-[#B5581A]/50"
                />
              </div>
            </div>
            <ButtonV2
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full justify-center"
            >
              {isLoading ? "Please wait..." : "Continue"}
            </ButtonV2>
          </form>
        ) : (
          <form onSubmit={handlePartnerSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-stone-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={partnerData.email}
                onChange={(e) =>
                  setPartnerData({ ...partnerData, email: e.target.value })
                }
                required
                className="h-11 rounded-xl border-stone-200 bg-stone-50 px-4 text-stone-900 placeholder:text-stone-400 focus-visible:ring-[#B5581A]/30 focus-visible:border-[#B5581A]/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-stone-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={partnerData.password}
                onChange={(e) =>
                  setPartnerData({ ...partnerData, password: e.target.value })
                }
                required
                className="h-11 rounded-xl border-stone-200 bg-stone-50 px-4 text-stone-900 placeholder:text-stone-400 focus-visible:ring-[#B5581A]/30 focus-visible:border-[#B5581A]/50"
              />
            </div>
            <ButtonV2
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full justify-center"
            >
              {isLoading ? "Please wait..." : "Sign In"}
            </ButtonV2>
          </form>
        )}

        {/* Owner login link */}
        <div className="mt-5 text-center">
          <Link
            href="/pricing"
            className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
          >
            Are you an owner?
          </Link>
        </div>
      </div>
    </div>
  );
}
