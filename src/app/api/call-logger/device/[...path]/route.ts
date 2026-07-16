import { NextRequest, NextResponse } from "next/server";

/**
 * Partner-scoped proxy for the web flow editor (menuthere.com/flow/<id>).
 *
 * Forwards the caller's per-device token (minted by the app's /register) straight
 * to the Worker's DEVICE endpoints. The Worker derives the partner from the token,
 * so this needs NO admin key and NO superadmin session — the token IS the auth, and
 * a partner can only ever read/write their own flow. Only /flow and /run-flow are
 * exposed here.
 */
const WORKER = process.env.CALL_LOGGER_WORKER_URL!;
const ALLOWED = new Set(["flow", "run-flow"]);

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  if (!path.length || !ALLOWED.has(path[0])) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+.+/i.test(auth)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const search = new URL(req.url).search;
  const target = `${WORKER}/${path.join("/")}${search}`;
  const init: RequestInit = {
    method: req.method,
    headers: { authorization: auth, "content-type": "application/json" },
  };
  if (req.method !== "GET" && req.method !== "HEAD") init.body = await req.text();

  const resp = await fetch(target, init);
  return new NextResponse(await resp.text(), {
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
