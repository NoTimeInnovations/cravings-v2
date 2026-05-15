import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/google/callback`;

  // Pass context (login | signup | gbp-signup) via OAuth state param. For
  // gbp-signup we also need the place_id of the picked Google business so the
  // callback can create the partner from it; we encode as `gbp-signup:<id>`.
  const context = request.nextUrl.searchParams.get("context") || "signup";
  const placeId = request.nextUrl.searchParams.get("placeId") || "";
  const state =
    context === "gbp-signup" && placeId
      ? `gbp-signup:${placeId}`
      : context;

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
