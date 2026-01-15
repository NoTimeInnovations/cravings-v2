"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Notification } from "@/app/actions/notification";
import { getUserCountry, validatePhoneNumber, getPhoneValidationError, UserCountryInfo } from "@/lib/getUserCountry";
import OtpLogin from "@/components/auth/OtpLogin";
type LoginMode = "user" | "partner";
export default function Login() {
  const { signInWithPhone, signInPartnerWithEmail } = useAuthStore();
  const navigate = useRouter();
  const [mode, setMode] = useState<LoginMode>("partner");
  const [isLoading, setIsLoading] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [userCountryInfo, setUserCountryInfo] = useState<UserCountryInfo | null>(null);
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
      const partner = await signInPartnerWithEmail(partnerData.email, partnerData.password);
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
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center bg-white sm:bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white sm:rounded-3xl sm:shadow-xl sm:shadow-gray-200/50 p-2 sm:p-10 space-y-6 transition-all duration-300">

        {/* Header Section - More compact */}
        <div className="flex flex-col items-center space-y-2">
          <div className="h-12 w-12 bg-orange-50 rounded-xl flex items-center justify-center">
            <UtensilsCrossed className="h-6 w-6 text-orange-600" />
          </div>
          <div className="text-center space-y-0.5">
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto">
              Sign in to manage your orders
            </p>
          </div>
        </div>

        {/* Custom Segmented Control */}
        <div className="bg-gray-100 p-1 rounded-xl flex relative">
          <button
            type="button"
            onClick={() => setMode("partner")}
            className={`flex-1 relative z-10 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ease-out ${mode === "partner"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
              }`}
          >
            Partner
          </button>
          <button
            type="button"
            onClick={() => setMode("user")}
            className={`flex-1 relative z-10 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ease-out ${mode === "user"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
              }`}
          >
            User
          </button>
        </div>

        {/* Form Section */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {mode === "user" ? (
            <OtpLogin
              storeName={null}
              onLoginSuccess={async (phone) => {
                if (!userCountryInfo) {
                  toast.error("Unable to detect your country. Please try again.");
                  return;
                }
                const cleanedPhone = phone.replace(/^\+\d+/, "");
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
                }
              }}
            />
          ) : (
            <form onSubmit={handlePartnerSignIn} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs font-semibold text-gray-700 ml-1">
                    Email Address
                  </Label>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors duration-200">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@restaurant.com"
                      className="h-10 pl-10 text-sm bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all duration-200"
                      value={partnerData.email}
                      onChange={(e) =>
                        setPartnerData({ ...partnerData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password" className="text-xs font-semibold text-gray-700 ml-1">
                    Password
                  </Label>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors duration-200">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-10 pl-10 text-sm bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all duration-200"
                      value={partnerData.password}
                      onChange={(e) =>
                        setPartnerData({ ...partnerData, password: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-10 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-lg shadow-sm active:scale-[0.98] transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : "Sign In"}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-2">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-orange-600 transition-colors p-2 rounded-lg hover:bg-orange-50">
            <span>Are you a restaurant owner?</span>
            <span className="text-orange-600">Join us &rarr;</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
