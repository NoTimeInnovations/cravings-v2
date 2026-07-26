"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { TELEVERY_LOGIN_PATH, TELEVERY_ROLE } from "@/lib/televery";

// Client-side companion to the middleware gate on /televery. Middleware is the
// real enforcement; this only avoids rendering marketplace chrome to the wrong
// session. It must render null while `loading` is true because AuthInitializer
// hydrates userData from the cookie on mount — redirecting before that lands
// would bounce a legitimate Televery session straight back to the login page.
export default function TeleveryGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const userData = useAuthStore((s) => s.userData);
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    if (loading) return;
    if (userData?.role !== TELEVERY_ROLE) router.replace(TELEVERY_LOGIN_PATH);
  }, [loading, userData, router]);

  if (loading || userData?.role !== TELEVERY_ROLE) return null;
  return <>{children}</>;
}
