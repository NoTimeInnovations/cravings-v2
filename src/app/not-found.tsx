import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found | Menuthere",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfbf7] px-6">
      <div className="text-center max-w-md">
        <p className="text-sm font-semibold text-orange-600 uppercase tracking-widest mb-4">
          404
        </p>
        <h1 className="text-3xl font-semibold text-stone-900 mb-4">
          Page not found
        </h1>
        <p className="text-stone-500 mb-8 leading-relaxed">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-orange-600 rounded-full hover:bg-orange-700 transition-colors"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}
