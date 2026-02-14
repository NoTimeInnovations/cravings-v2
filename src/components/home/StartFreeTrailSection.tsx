import Link from "next/link";

export default function StartFreeTrailSection() {
  return (
    <section className="relative overflow-hidden bg-terracotta-600 py-16 md:py-24 border-t border-b border-stone-200">
      <div className="bg-terracotta-400/20 w-full h-px" />

      <div className="w-full h-full z-20 absolute top-0 left-1/2 -translate-x-1/2 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] border-l border-r border-terracotta-400/20" />

      <div className="sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto grid md:grid-cols-2">
        <div className="max-w-xl p-6 md:p-12">
          <h1 className="text-3xl md:text-4xl font-semibold text-white mb-4">
            Get your restaurant online in under 2 minutes.
          </h1>
          <p className="text-white/70 mb-6">
            Upload your existing menu, customize your brand colors, and share
            your QR code with customers. No technical skills needed no app
            downloads required. Join 600+ restaurants already growing with
            Menuthere
          </p>
          <div className="flex gap-3">
            <Link
              href="/get-started"
              className="inline-flex items-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-stone-800"
            >
              Start for free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium text-white border border-white/40 transition-colors duration-200 hover:bg-white/10"
            >
              See all plans
            </Link>
          </div>
        </div>

        <div className="hidden md:block h-full w-full border-l border-terracotta-400/20 relative">
          <div className="relative h-full py-12 bg-[radial-gradient(circle,rgba(255,255,255,0.18)_1.5px,transparent_1.5px)] bg-[size:20px_20px]"></div>
        </div>
      </div>

      <div className="bg-terracotta-400/20 w-full h-px" />
    </section>
  );
}
