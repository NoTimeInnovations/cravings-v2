import { NextRequest, NextResponse } from "next/server";
import { getAuthCookie } from "@/app/auth/actions";

/**
 * Server-side proxy: browser -> this route -> Cloudflare Worker /admin/*.
 * The ADMIN_API_KEY is attached here and never sent to the client, and the
 * caller must be a logged-in superadmin (same auth as the /superadmin pages).
 */
const WORKER = process.env.CALL_LOGGER_WORKER_URL!;
const ADMIN_KEY = process.env.CALL_LOGGER_ADMIN_KEY!;

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  const auth = await getAuthCookie();
  if (auth?.role !== "superadmin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const search = new URL(req.url).search;
  const target = `${WORKER}/admin/${path.join("/")}${search}`;
  const init: RequestInit = {
    method: req.method,
    headers: { authorization: `Bearer ${ADMIN_KEY}`, "content-type": "application/json" },
  };
  if (req.method !== "GET" && req.method !== "HEAD") init.body = await req.text();

  const resp = await fetch(target, init);
  const body = await resp.text();
  return new NextResponse(body, {
    status: resp.status,
    headers: { "content-type": "application/json" },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };
export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
