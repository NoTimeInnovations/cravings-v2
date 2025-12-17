// app/providers/AuthInitializer.tsx
"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { getAuthCookie, getTempUserIdCookie, setTempUserIdCookie } from "@/app/auth/actions";
import { Notification } from "@/app/actions/notification";
import { usePathname, useRouter } from "next/navigation";

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

  return null;
};

export default AuthInitializer;