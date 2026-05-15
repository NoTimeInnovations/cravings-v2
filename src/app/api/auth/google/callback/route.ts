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
  const rawState = request.nextUrl.searchParams.get("state") || "signup";

  // `gbp-signup:<placeId>` carries the Google place_id through OAuth.
  let context = rawState;
  let gbpPlaceId = "";
  if (rawState.startsWith("gbp-signup:")) {
    context = "gbp-signup";
    gbpPlaceId = rawState.slice("gbp-signup:".length);
  }

  const failRedirect = (reason: string) => {
    if (context === "login") return `/login?google_error=${reason}`;
    if (context === "gbp-signup") {
      const qs = new URLSearchParams({
        google_error: reason,
        ...(gbpPlaceId ? { placeId: gbpPlaceId } : {}),
      });
      return `/signup-from-google?${qs.toString()}`;
    }
    return `/get-started?step=3&google_error=${reason}`;
  };

  if (!code) {
    return NextResponse.redirect(new URL(failRedirect("no_code"), request.url));
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
      return NextResponse.redirect(
        new URL(failRedirect("token_failed"), request.url),
      );
    }

    // Fetch user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userRes.json();

    if (!userData.email) {
      return NextResponse.redirect(
        new URL(failRedirect("no_email"), request.url),
      );
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
      return NextResponse.redirect(new URL("/admin-v2", request.url));
    }

    // Google-business quick-signup flow: if a partner already exists for
    // this Google email, log them in; otherwise create one from the picked
    // place and redirect to the new /[username]/home.
    if (context === "gbp-signup") {
      if (!gbpPlaceId) {
        return NextResponse.redirect(
          new URL(failRedirect("missing_place"), request.url),
        );
      }
      const existing = await fetchFromHasura(PARTNER_BY_EMAIL_QUERY, {
        email: userData.email,
      }) as any;
      const existingPartner = existing?.partners?.[0];
      if (existingPartner) {
        await setAuthCookie({
          id: existingPartner.id,
          role: "partner",
          feature_flags: existingPartner.feature_flags || "",
          status: existingPartner.status || "active",
          hasSubscription: !!existingPartner.subscription_details,
        });
        return NextResponse.redirect(new URL("/admin-v2", request.url));
      }

      // New partner: bounce back to /signup-from-google with the verified
      // Google email so the client component can pick up the uploaded menu
      // files from sessionStorage and call quickSignupFromGoogle with them.
      // (sessionStorage is not accessible here on the server.)
      const finalize = new URL("/signup-from-google", request.url);
      finalize.searchParams.set("placeId", gbpPlaceId);
      finalize.searchParams.set(
        "google_email",
        userData.email,
      );
      finalize.searchParams.set("from_google", "1");
      return NextResponse.redirect(finalize);
    }

    // For signup context: redirect back to get-started with email
    return NextResponse.redirect(
      new URL(`/get-started?step=3&google_email=${encodeURIComponent(userData.email)}`, request.url)
    );
  } catch (error) {
    return NextResponse.redirect(
      new URL(failRedirect("server_error"), request.url),
    );
  }
}
