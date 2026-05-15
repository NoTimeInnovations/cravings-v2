import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, type Schema } from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_KEY = process.env.GEMINI_API_KEY;

type InlineFile = { data: string; mimeType: string };

type GenerateBody = {
  model: string;
  prompt: string;
  responseMimeType?: string;
  responseSchema?: Schema;
  files?: InlineFile[];
};

// Browsers always send Origin for cross-origin POSTs (and for same-origin
// POSTs in modern Chrome/Safari/Firefox). We reject anything that isn't a
// known Menuthere / Cravings frontend. This stops casual abuse from other
// websites but does NOT stop curl/Postman — those can forge Origin freely.
// For true protection, add a session check or per-IP rate limiting.
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https?:\/\/localhost(:\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/i,
  /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/i,
  /^https:\/\/([a-z0-9-]+\.)?menuthere\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)?cravings\.live$/i,
  // Vercel preview deployments for this repo.
  /^https:\/\/cravings-v2[a-z0-9-]*\.vercel\.app$/i,
];

// Optional override: comma-separated list of exact origins.
const ENV_ALLOWED = (process.env.AI_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ENV_ALLOWED.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  // Fall back to referer's origin if Origin header is missing.
  let effectiveOrigin = origin;
  if (!effectiveOrigin) {
    const referer = req.headers.get("referer");
    if (referer) {
      try {
        effectiveOrigin = new URL(referer).origin;
      } catch {
        effectiveOrigin = null;
      }
    }
  }

  if (!isAllowedOrigin(effectiveOrigin)) {
    return NextResponse.json(
      { error: "Forbidden origin" },
      { status: 403 }
    );
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured on server" },
      { status: 500 }
    );
  }

  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.model || typeof body.model !== "string") {
    return NextResponse.json({ error: "Missing 'model'" }, { status: 400 });
  }
  if (!body.prompt || typeof body.prompt !== "string") {
    return NextResponse.json({ error: "Missing 'prompt'" }, { status: 400 });
  }

  const generationConfig: Record<string, unknown> = {};
  if (body.responseMimeType) generationConfig.responseMimeType = body.responseMimeType;
  if (body.responseSchema) generationConfig.responseSchema = body.responseSchema;

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: body.model,
      generationConfig,
    });

    const parts: any[] = [body.prompt];
    if (Array.isArray(body.files)) {
      for (const f of body.files) {
        if (!f?.data || !f?.mimeType) continue;
        parts.push({ inlineData: { data: f.data, mimeType: f.mimeType } });
      }
    }

    const result = await model.generateContent(parts);
    const text = result.response.text();
    return NextResponse.json({ text });
  } catch (e: any) {
    console.error("/api/ai/generate failed", e);
    return NextResponse.json(
      { error: e?.message ?? "Gemini call failed" },
      { status: 500 }
    );
  }
}
