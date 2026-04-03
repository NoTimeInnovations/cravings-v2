"use client";

import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

export default function RestaurantGrader() {
  const [url, setUrl] = useState("");

  return (
    <section className="py-20 bg-stone-950 relative overflow-hidden">
      {/* Dot grid bg */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-600/10 border border-orange-600/20 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs font-medium text-orange-400 uppercase tracking-wider">
            AI-Powered, Coming Soon
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
          How much are you losing to aggregators?
        </h2>
        <p className="text-base text-stone-400 max-w-lg mx-auto mb-10 leading-relaxed">
          Enter your restaurant name or Google listing URL. Our AI will scan
          your online presence, estimate commission losses, and show you exactly
          how much more you could earn with your own delivery website.
        </p>

        <div className="flex gap-3 max-w-md mx-auto">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Your restaurant name or Google URL"
            className="flex-1 rounded-full bg-white/10 border border-white/10 px-5 py-3 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          <button className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-3 text-sm font-medium text-white hover:bg-orange-700 transition-colors">
            Grade
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-stone-600 mt-4">
          Free report, no signup required
        </p>
      </div>
    </section>
  );
}
