import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { setAuthCookie } from "@/app/auth/actions";

const PARTNER_BY_EMAIL_QUERY = `
  query PartnerByEmail($email: String!) {
    partners(where: { email: { _eq: $email } }, limit: 1) {
      id
      status
      feature_flags
      subscription_details
    }
  }
`;

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const context = request.nextUrl.searchParams.get("state") || "signup";

  if (!code) {
    const errorRedirect = context === "login"
      ? "/login?google_error=no_code"
      : "/get-started?step=3&google_error=no_code";
    return NextResponse.redirect(new URL(errorRedirect, request.url));
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      const errorRedirect = context === "login"
        ? "/login?google_error=token_failed"
        : "/get-started?step=3&google_error=token_failed";
      return NextResponse.redirect(new URL(errorRedirect, request.url));
    }

    // Fetch user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userRes.json();

    if (!userData.email) {
      const errorRedirect = context === "login"
        ? "/login?google_error=no_email"
        : "/get-started?step=3&google_error=no_email";
      return NextResponse.redirect(new URL(errorRedirect, request.url));
    }

    // For login context: find partner by email and log them in
    if (context === "login") {
      const response = await fetchFromHasura(PARTNER_BY_EMAIL_QUERY, {
        email: userData.email,
      }) as any;

      const partner = response?.partners?.[0];
      if (!partner) {
        return NextResponse.redirect(
          new URL(`/login?google_error=no_account&email=${encodeURIComponent(userData.email)}`, request.url)
        );
      }

      await setAuthCookie({
        id: partner.id,
        role: "partner",
        feature_flags: partner.feature_flags || "",
        status: partner.status || "inactive",
        hasSubscription: !!partner.subscription_details,
      });

      const redirectPath = partner.subscription_details ? "/admin-v2" : "/admin";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    // For signup context: redirect back to get-started with email
    return NextResponse.redirect(
      new URL(`/get-started?step=3&google_email=${encodeURIComponent(userData.email)}`, request.url)
    );
  } catch (error) {
    const errorRedirect = context === "login"
      ? "/login?google_error=server_error"
      : "/get-started?step=3&google_error=server_error";
    return NextResponse.redirect(new URL(errorRedirect, request.url));
  }
}
