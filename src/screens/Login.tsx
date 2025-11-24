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
type LoginMode = "user" | "partner";
export default function Login() {
  const { signInWithPhone, signInPartnerWithEmail } = useAuthStore();
  const navigate = useRouter();
  const [mode, setMode] = useState<LoginMode>("user");
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
      await signInPartnerWithEmail(partnerData.email, partnerData.password);
      await Notification.token.save();
      navigate.push("/admin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in");
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg p-6">
        <div className="flex flex-col items-center mb-8">
          <UtensilsCrossed className="h-12 w-12 text-orange-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Welcome to Cravings
          </h1>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            type="button"
            onClick={() => setMode("user")}
            className={`flex-1 ${
              mode === "user" ? "bg-orange-600" : "bg-gray-200"
            }`}
          >
            Sign in as User
          </Button>
          <Button
            type="button"
            onClick={() => setMode("partner")}
            className={`flex-1 ${
              mode === "partner" ? "bg-orange-600" : "bg-gray-200"
            }`}
          >
            Sign in as Partner
          </Button>
        </div>

        {mode === "user" ? (
          <form onSubmit={handleUserSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number
              </Label>
              <div className="flex gap-2">
                {userCountryInfo && (
                  <div className="flex items-center px-3 bg-gray-100 rounded-md text-sm font-medium">
                    {userCountryInfo.callingCode}
                  </div>
                )}
                <Input
                  id="phone"
                  type="tel"
                  placeholder={
                    userCountryInfo
                      ? `Enter your ${userCountryInfo.phoneDigits}-digit phone number`
                      : "Enter your phone number"
                  }
                  value={userPhone}
                  onChange={(e) => {
                    const maxDigits = userCountryInfo?.phoneDigits || 10;
                    setUserPhone(e.target.value.replace(/\D/g, "").slice(0, maxDigits));
                  }}
                  required
                  className="flex-1"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={isLoading}
            >
              {isLoading ? "Please wait..." : "Continue"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handlePartnerSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={partnerData.email}
                  onChange={(e) =>
                    setPartnerData({ ...partnerData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  
                  placeholder="Enter your password"
                  value={partnerData.password}
                  onChange={(e) =>
                    setPartnerData({ ...partnerData, password: e.target.value })
                  }
                  required
                />
                {/* <Link
                  href="/login/forgot-password"
                  className="text-right flex flex-1 justify-end w-full  text-sm text-gray-500 hover:text-orange-600"
                >
                  Forgot Password?
                </Link> */}
              </div>
              <Button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={isLoading}
              >
                {isLoading ? "Please wait..." : "Sign In"}
              </Button>
            </form>
          </div>
        )}
        {/* Owner login link */}
        <div className="mt-4 text-center">
          <Link href="/newlogin" className="text-sm text-orange-600 hover:underline">
            Are you an owner?
          </Link>
        </div>
      </div>
    </div>
  );
}
