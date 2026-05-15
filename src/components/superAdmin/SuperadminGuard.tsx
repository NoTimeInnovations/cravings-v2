"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

// Client-side gate for the /superadmin route segment. AuthInitializer hydrates
// `userData` from the auth cookie on mount; until that finishes we render
// nothing so we don't flash a redirect on real superadmin sessions.
export default function SuperadminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const userData = useAuthStore((s) => s.userData);
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    if (loading) return;
    if (userData?.role !== "superadmin") {
      router.replace("/superLogin");
    }
  }, [loading, userData, router]);

  if (loading || userData?.role !== "superadmin") {
    return null;
  }

  return <>{children}</>;
}
