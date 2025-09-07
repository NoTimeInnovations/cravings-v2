// app/providers/AuthInitializer.tsx
"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { getAuthCookie, getTempUserIdCookie, setTempUserIdCookie } from "@/app/auth/actions";
import { Notification } from "@/app/actions/notification";

const AuthInitializer = () => {
  const { fetchUser } = useAuthStore();


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