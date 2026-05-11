import type { Schema } from "@google/generative-ai";

export type AiFile = { data: string; mimeType: string };

export type AiGenerateInput = {
  model: string;
  prompt: string;
  responseMimeType?: string;
  responseSchema?: Schema;
  files?: AiFile[];
};

// Calls the server-side /api/ai/generate proxy. The Gemini API key never
// leaves the server — each caller used to reach Google directly with
// NEXT_PUBLIC_GEMINI_API_KEY, which leaked the key into the JS bundle.
export async function aiGenerate(input: AiGenerateInput): Promise<string> {
  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let message = `aiGenerate failed: HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) message = j.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  const j = (await res.json()) as { text?: string };
  return j.text ?? "";
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}
