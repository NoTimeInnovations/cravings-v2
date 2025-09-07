"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import Link from "next/link";
type LoginMode = "user" | "partner";
export default function page() {
  const { signInSuperAdminWithEmail } = useAuthStore();
  const navigate = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [partnerData, setPartnerData] = useState({
    email: "",
    password: ""
  });

  const handleSuperAdminSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    signInSuperAdminWithEmail(partnerData.email, partnerData.password)
      .then((res) => {
        setIsLoading(false);
        setTimeout(() => {
          navigate.push("/superadmin");
        }, 1000);
      })
      .catch((err) => {
        setIsLoading(false);
        toast.error(err.message);
      }); 
  }


  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg p-6">
        <div className="flex flex-col items-center mb-8">
          <UtensilsCrossed className="h-12 w-12 text-orange-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Welcome to Cravings Admin
          </h1>
        </div>

        <div className="space-y-4">
          <form onSubmit={(e: React.FormEvent<HTMLFormElement>)=>{handleSuperAdminSignIn(e)}} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={partnerData.email}
                onChange={(e) => setPartnerData({ ...partnerData, email: e.target.value })}
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
                onChange={(e) => setPartnerData({ ...partnerData, password: e.target.value })}
                required
              />
              {/* <Link href="/login/forgot-password" className="text-right flex flex-1 justify-end w-full  text-sm text-gray-500 hover:text-orange-600">Forgot Password?</Link> */}
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
      </div>
    </div>
  );
}
