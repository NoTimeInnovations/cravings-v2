import { termsHtml } from "./content";

export async function GET() {
  return new Response(termsHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
