"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "analytics_auth";

export async function isAnalyticsAuthed(): Promise<boolean> {
  const expected = process.env.ANALYTICS_PASSWORD;
  if (!expected) return false;
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  return value === expected;
}

export async function authenticateAnalytics(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ANALYTICS_PASSWORD;

  if (!expected || password !== expected) {
    redirect("/analytics?error=1");
  }

  (await cookies()).set(COOKIE_NAME, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/analytics",
    sameSite: "lax",
  });

  redirect("/analytics");
}
