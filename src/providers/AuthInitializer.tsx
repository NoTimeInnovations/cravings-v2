// app/providers/AuthInitializer.tsx
"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { getAuthCookie, getTempUserIdCookie, setTempUserIdCookie } from "@/app/auth/actions";
import { Notification } from "@/app/actions/notification";
import { usePathname, useRouter } from "next/navigation";
import { usePostHog } from "@/providers/posthog-provider";

const AuthInitializer = () => {
  const { fetchUser, userData, loading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && userData?.role === "partner") {
      const restrictedPaths = ["/", "/explore"];
      if (restrictedPaths.includes(pathname)) {
        if ((userData as any).subscription_details) {
          router.push("/admin-v2");
        } else {
          router.push("/admin");
        }
      }
    }

    if (!loading && userData?.role === "captain") {
      const restrictedPaths = ["/", "/explore"];
      if (restrictedPaths.includes(pathname)) {
        router.push("/captain");
      }
    }
  }, [userData, loading, pathname, router]);


  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await fetchUser();
        const isTempAuth = await getTempUserIdCookie() !== null;
        const isSignAuth = await getAuthCookie() !== null;
        const isAuth = isSignAuth || isTempAuth;
        if (!isAuth) {
          const uuid = crypto.randomUUID();
          await setTempUserIdCookie("temp_" + uuid);
          await Notification.token.save();
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
      }
    };

    initializeAuth();
  }, [fetchUser]);

  const posthog = usePostHog();

  useEffect(() => {
    if (loading || !userData) return;

    // Identify user
    posthog?.identify(userData.email, {
      email: userData.email,
      role: userData.role,
      name: (userData as any).full_name || (userData as any).name,
    });

    // Group by restaurant for partners and captains
    if (userData.role === "partner") {
      const partner = userData as any;
      if (partner.store_name) {
        posthog?.group("restaurant", partner.email, {
          name: partner.store_name,
          id: partner.id,
          status: partner.status,
        });
      }
    } else if (userData.role === "captain") {
      const captain = userData as any;
      if (captain.partner && captain.partner.store_name) {
        posthog?.group("restaurant", captain.partner.email, {
          name: captain.partner.store_name,
          id: captain.partner.id,
        });
      }
    }
  }, [userData, loading, posthog]);

  return null;
};

export default AuthInitializer;