"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TELEVERY_DASHBOARD_PATH } from "@/lib/televery";

// Marketplace sign-in. Televery uses its ordinary partner credentials here; the
// session is stamped with the `televery` role so middleware sends it to the
// marketplace dashboard instead of /admin-v2. Any other partner's credentials
// are rejected by signInTeleveryWithEmail.
export default function TeleveryLoginPage() {
  const signInTeleveryWithEmail = useAuthStore((s) => s.signInTeleveryWithEmail);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInTeleveryWithEmail(form.email.trim(), form.password);
      router.push(TELEVERY_DASHBOARD_PATH);
    } catch (err: any) {
      toast.error(err?.message || "Could not sign in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.04]">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/menuthere-logo-new.png"
            alt="Menuthere"
            width={48}
            height={48}
            className="mb-4 h-12 w-12 object-contain"
          />
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Televery
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to your marketplace dashboard
          </p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
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
  );
}
