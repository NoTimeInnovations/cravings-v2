"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
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
import { FcGoogle } from "react-icons/fc";

const DEFAULT_THEME = { accent: "#EA580C", bg: "#F5F5F5", text: "#000000" };

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

  const [theme, setTheme] = useState(DEFAULT_THEME);

  // Read stored hotel theme from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hotelTheme");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.accent) setTheme({ ...DEFAULT_THEME, ...parsed });
      }
    } catch {}
  }, []);

  // Fetch user country info on mount
  useEffect(() => {
    getUserCountry().then((info) => {
      setUserCountryInfo(info);
    });
  }, []);

  // Handle Google OAuth errors/success from URL params
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const googleError = searchParams.get("google_error");
    const email = searchParams.get("email");

    if (googleError) {
      if (googleError === "no_account" && email) {
        toast.error(`No partner account found for ${email}`);
      } else {
        toast.error("Google sign-in failed. Please try again.");
      }
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("google_error");
      url.searchParams.delete("email");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const handleGoogleSignIn = () => {
    window.location.href = "/api/auth/google?context=login";
  };

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
        navigate.push("/");
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
      await signInPartnerWithEmail(
        partnerData.email,
        partnerData.password,
      );
      await Notification.token.save();

      navigate.push("/admin-v2");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in");
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-8 sm:px-6"
      style={{
        backgroundColor: theme.bg,
        backgroundImage: `linear-gradient(${theme.text}0D 1px, transparent 1px), linear-gradient(90deg, ${theme.text}0D 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }}
    >
      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl p-5 sm:p-8 shadow-lg border border-black/5">
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <img
            src="/menuthere_logo_full.svg"
            alt="Menuthere"
            width={171}
            height={46}
            className="h-12 sm:h-10 w-auto object-contain mb-1"
          />
          <p className="text-xs mt-1" style={{ color: `${theme.text}66` }}>Digital menu for restaurants</p>
        </div>

        <div className="flex gap-2 mb-6 p-1 rounded-full" style={{ backgroundColor: `${theme.text}0A` }}>
          <button
            onClick={() => setMode("partner")}
            className="flex-1 py-2 text-sm font-medium rounded-full transition-all duration-200"
            style={
              mode === "partner"
                ? { backgroundColor: theme.accent, color: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }
                : { color: `${theme.text}80` }
            }
          >
            Partner
          </button>
          <button
            onClick={() => setMode("user")}
            className="flex-1 py-2 text-sm font-medium rounded-full transition-all duration-200"
            style={
              mode === "user"
                ? { backgroundColor: theme.accent, color: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }
                : { color: `${theme.text}80` }
            }
          >
            User
          </button>
        </div>

        {mode === "user" ? (
          <form onSubmit={handleUserSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium" style={{ color: `${theme.text}99` }}>
                Phone Number
              </Label>
              <div className="flex gap-2">
                {userCountryInfo && (
                  <div
                    className="flex items-center px-4 rounded-xl text-sm font-semibold shrink-0 border"
                    style={{ backgroundColor: `${theme.accent}15`, color: theme.accent, borderColor: `${theme.accent}30` }}
                  >
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
                  className="flex-1 min-w-0 h-11 rounded-xl border-stone-200 bg-stone-50 px-4 text-stone-900 placeholder:text-stone-400"
                  style={{ outline: "none" }}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl text-white text-sm font-semibold active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.accent }}
            >
              {isLoading ? "Please wait..." : "Continue"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 active:scale-[0.98] transition-all duration-200"
            >
              <FcGoogle className="text-xl" />
              Sign in with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-stone-400">or</span>
              </div>
            </div>

            <form onSubmit={handlePartnerSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium" style={{ color: `${theme.text}99` }}>
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
                  className="h-11 rounded-xl border-stone-200 bg-stone-50 px-4 text-stone-900 placeholder:text-stone-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium" style={{ color: `${theme.text}99` }}>
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
                  className="h-11 rounded-xl border-stone-200 bg-stone-50 px-4 text-stone-900 placeholder:text-stone-400"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl text-white text-sm font-semibold active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: theme.accent }}
              >
                {isLoading ? "Please wait..." : "Sign In"}
              </button>
            </form>
          </div>
        )}

        {/* Owner login link */}
        <div className="mt-5 text-center">
          <Link
            href="/pricing"
            className="text-sm font-medium transition-colors"
            style={{ color: `${theme.accent}B3` }}
          >
            Are you an owner?
          </Link>
        </div>
      </div>
    </div>
  );
}
