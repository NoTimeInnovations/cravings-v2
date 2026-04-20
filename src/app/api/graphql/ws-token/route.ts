import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptText } from "@/lib/encrtption";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("new_auth_token")?.value;

    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decrypted = decryptText(authToken);
    if (!decrypted?.id || !decrypted?.role) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json({
      token: process.env.HASURA_GRAPHQL_ADMIN_SECRET!,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
