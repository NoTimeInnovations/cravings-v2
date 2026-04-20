// src/app/blog/[slug]/page.tsx
// Individual blog post page for menuthere.com/blog/[slug]

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { unstable_cache } from "next/cache";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { BlogViewTracker } from "@/components/blog/BlogViewTracker";

const Footer = dynamic(() => import("@/components/Footer"));

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content_html?: string;
  cover_image?: string;
  published_at?: string;
  updated_at?: string;
  meta_title?: string;
  meta_description?: string;
}

interface Props {
  params: Promise<{ slug: string }>;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const getPost = unstable_cache(
  async (slug: string): Promise<BlogPost | null> => {
    const query = `
      query GetPostBySlug($slug: String!) {
        blog_posts(where: { slug: { _eq: $slug }, status: { _eq: "published" } }) {
          id
          title
          slug
          excerpt
          content_html
          cover_image
          published_at
          updated_at
          meta_title
          meta_description
        }
      }
    `;

    try {
      const res = await fetch(
        process.env.HASURA_GRAPHQL_ENDPOINT as string,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-hasura-admin-secret": process.env
              .HASURA_GRAPHQL_ADMIN_SECRET as string,
          },
          body: JSON.stringify({ query, variables: { slug } }),
          cache: "no-store",
        }
      );
      const json = await res.json();
      return json.data?.blog_posts?.[0] ?? null;
    } catch (error) {
      console.error("Error fetching post:", error);
      return null;
    }
  },
  ["blog-post"],
  { tags: ["blog-posts"] }
);

const getOtherPosts = unstable_cache(
  async (currentSlug: string): Promise<BlogPost[]> => {
    const query = `
      query GetOtherPosts($slug: String!) {
        blog_posts(
          where: { status: { _eq: "published" }, slug: { _neq: $slug } }
          order_by: { published_at: desc }
          limit: 2
        ) {
          id
          title
          slug
          excerpt
          published_at
        }
      }
    `;

    try {
      const res = await fetch(
        process.env.HASURA_GRAPHQL_ENDPOINT as string,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-hasura-admin-secret": process.env
              .HASURA_GRAPHQL_ADMIN_SECRET as string,
          },
          body: JSON.stringify({ query, variables: { slug: currentSlug } }),
          cache: "no-store",
        }
      );
      const json = await res.json();
      return json.data?.blog_posts ?? [];
    } catch (error) {
      console.error("Error fetching other posts:", error);
      return [];
    }
  },
  ["blog-other-posts"],
  { tags: ["blog-posts"] }
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) return { title: "Post Not Found" };

  return {
    title: `${post.meta_title || post.title} | Menuthere Blog`,
    description: post.meta_description || post.excerpt,
    alternates: {
      canonical: `https://menuthere.com/blog/${slug}`,
    },
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      images: post.cover_image ? [{ url: post.cover_image }] : [],
      type: "article",
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      url: `https://menuthere.com/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [post, otherPosts] = await Promise.all([
    getPost(slug),
    getOtherPosts(slug),
  ]);

  if (!post) notFound();

  return (
    <div className="min-h-screen bg-white geist-font">
      <BlogViewTracker postId={post.id} />
      <article>
        {/* Top bar */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 pt-24 pb-8">
          <div className="flex items-center justify-between mb-10">
            <Link
              href="/blog"
              className="text-sm text-stone-500 hover:text-orange-500 transition-colors"
            >
              ← Blog
            </Link>
            <span className="text-sm text-stone-400">
              {formatDate(post.published_at)}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight leading-tight max-w-5xl text-balance text-stone-900">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-4 text-lg text-stone-500 max-w-3xl leading-relaxed">
              {post.excerpt}
            </p>
          )}
        </div>

        {/* Cover image */}
        {post.cover_image && (
          <div className="max-w-7xl mx-auto px-6 md:px-10 mb-12">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
              <Image
                src={post.cover_image}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        )}

        {/* Content with TOC sidebar */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-12">
            {/* TOC Sidebar */}
            <aside className="hidden lg:block">
              <TableOfContents contentHtml={post.content_html || ""} />
            </aside>

            {/* Main Content */}
            <div className="min-w-0">
              <div
                data-blog-content
                className="prose-menuthere"
                dangerouslySetInnerHTML={{ __html: post.content_html || "" }}
              />
            </div>
          </div>
        </div>
      </article>

      {/* Other articles */}
      {otherPosts.length > 0 && (
        <section className="border-t border-stone-100">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-16">
            <h2 className="text-2xl font-semibold tracking-tight text-center mb-12 text-stone-900">
              More articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-stone-100 items-start">
              {otherPosts.map((other) => (
                <Link
                  key={other.id}
                  href={`/blog/${other.slug}`}
                  className="group block hover:bg-orange-50/30 p-5 sm:p-10 transition-colors"
                >
                  <div className="flex items-center justify-between text-sm text-stone-500 mb-4">
                    <span>{formatDate(other.published_at)}</span>
                    <span className="font-semibold text-stone-700">Blog</span>
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight leading-snug group-hover:text-orange-500 transition-colors text-stone-900 text-pretty">
                    {other.title}
                  </h3>
                  {other.excerpt && (
                    <p className="mt-2 text-sm text-stone-500 line-clamp-2 leading-relaxed">
                      {other.excerpt}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer appName="Menuthere" />
    </div>
  );
}
