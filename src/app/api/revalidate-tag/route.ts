import { revalidateTag } from "@/app/actions/revalidate";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tag = searchParams.get("tag");

  if (!tag) {
    return new Response("Missing tag", { status: 400 });
  }

  try {
    await revalidateTag(tag);
    return new Response("Success", { status: 200 });
  } catch (error) {
    console.error("Error revalidating tag:", error);
    return new Response("Error", { status: 500 });
  }
}
