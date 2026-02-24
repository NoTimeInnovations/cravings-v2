// src/app/blog/page.tsx
// Blog listing page for menuthere.com/blog

import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { unstable_cache } from "next/cache";

const Footer = dynamic(() => import("@/components/Footer"));

export const metadata: Metadata = {
  title: "Blog | Menuthere - Restaurant & Cafe Insights",
  description:
    "Tips, guides, and insights for restaurant owners on digital menus, QR codes, Google Business sync, and growing your food business.",
  alternates: {
    canonical: "https://menuthere.com/blog",
  },
  openGraph: {
    title: "Blog | Menuthere",
    description:
      "Tips, guides, and insights for restaurant owners on digital menus, QR codes, and growing your food business.",
    url: "https://menuthere.com/blog",
    type: "website",
  },
};

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  cover_image?: string;
  published_at?: string;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const getLatestPosts = unstable_cache(
  async (): Promise<BlogPost[]> => {
    const query = `
      query GetLatestPosts {
        blog_posts(
          where: { status: { _eq: "published" } }
          order_by: { published_at: desc }
          limit: 20
        ) {
          id
          title
          slug
          excerpt
          cover_image
          published_at
        }
      }
    `;

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT as string,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-hasura-admin-secret": process.env
              .NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET as string,
          },
          body: JSON.stringify({ query }),
          cache: "no-store",
        }
      );
      const json = await res.json();
      return json.data?.blog_posts ?? [];
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      return [];
    }
  },
  ["blog-posts-list"],
  { tags: ["blog-posts"] }
);

export default async function BlogPage() {
  const posts = await getLatestPosts();
  const heroPosts = posts.slice(0, 2);
  const remainingPosts = posts.slice(2);

  return (
    <div className="min-h-screen bg-white geist-font">
      {/* Hero header */}
      <section className="bg-[#fcfbf7] border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 md:px-10 pt-28 pb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-500 mb-4">
            Blog
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tighter leading-[1.15] text-stone-900">
            Latest updates and insights
            <br />
            <span className="text-stone-400 font-normal">from Menuthere</span>
          </h1>

          {/* Featured 2 posts */}
          {heroPosts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-stone-200 mt-14 items-start">
              {heroPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group block hover:bg-orange-50/40 p-5 sm:p-10 transition-colors"
                >
                  <div className="flex items-center justify-between text-sm text-stone-500 mb-5">
                    <span>{formatDate(post.published_at)}</span>
                    <span className="font-semibold text-stone-700">Blog</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-semibold leading-tight tracking-tighter mb-3 group-hover:text-orange-500 transition-colors text-stone-900">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-stone-500 leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Remaining posts grid */}
      {remainingPosts.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-12">
          <div className="divide-y divide-stone-100">
            {Array.from(
              { length: Math.ceil(remainingPosts.length / 2) },
              (_, i) => remainingPosts.slice(i * 2, i * 2 + 2)
            ).map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-stone-100"
              >
                {row.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group block hover:bg-orange-50/30 p-5 sm:p-10 transition-colors"
                  >
                    <div className="flex items-center justify-between text-sm text-stone-500 mb-4">
                      <span>{formatDate(post.published_at)}</span>
                      <span className="font-semibold text-stone-700">Blog</span>
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight leading-snug mb-2 group-hover:text-orange-500 transition-colors text-stone-900 text-pretty">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {posts.length === 0 && (
        <p className="text-center py-24 text-stone-400">
          No articles published yet. Stay tuned!
        </p>
      )}

      <Footer appName="Menuthere" />
    </div>
  );
}
