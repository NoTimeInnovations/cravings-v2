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

export async function POST(req: NextRequest) {
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
