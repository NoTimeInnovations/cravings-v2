import { NextRequest, NextResponse } from "next/server";

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT as string;
const HASURA_ADMIN_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET as string;

async function hasuraFetch(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(HASURA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json();
    if (!postId) {
      return NextResponse.json({ error: "postId required" }, { status: 400 });
    }

    // Use IP + post combo as unique viewer identifier
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const viewerKey = `${ip}:${postId}`;

    // Check cookie for already-viewed posts to avoid unnecessary DB calls
    const viewedCookie = request.cookies.get("blog_viewed")?.value || "";
    const viewedPosts = viewedCookie ? viewedCookie.split(",") : [];

    if (viewedPosts.includes(postId)) {
      return NextResponse.json({ success: true, alreadyViewed: true });
    }

    // Check if this viewer already exists in blog_post_views
    const checkResult = await hasuraFetch(`
      query CheckView($postId: uuid!, $viewerKey: String!) {
        blog_post_views(where: { post_id: { _eq: $postId }, viewer_key: { _eq: $viewerKey } }) {
          id
        }
      }
    `, { postId, viewerKey });

    const alreadyViewed = (checkResult.data?.blog_post_views?.length ?? 0) > 0;

    if (!alreadyViewed) {
      // Insert view record and increment views count
      await hasuraFetch(`
        mutation TrackBlogView($postId: uuid!, $viewerKey: String!) {
          insert_blog_post_views_one(object: { post_id: $postId, viewer_key: $viewerKey }) {
            id
          }
          update_blog_posts_by_pk(pk_columns: { id: $postId }, _inc: { views: 1 }) {
            views
          }
        }
      `, { postId, viewerKey });
    }

    // Set cookie to remember viewed posts
    const updatedViewed = [...new Set([...viewedPosts, postId])].slice(-100).join(",");
    const response = NextResponse.json({ success: true, alreadyViewed });
    response.cookies.set("blog_viewed", updatedViewed, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Blog view tracking error:", error);
    return NextResponse.json({ error: "Failed to track view" }, { status: 500 });
  }
}
