"use client";

import Image from "next/image";
import { Phone, Instagram, Globe, MapPin, Clock, Star } from "lucide-react";

interface SplashScreenProps {
  storeName: string;
  storeBanner?: string;
  storeTagline?: string;
  notices?: any[];
  socialLinks?: any;
  onContinue: () => void;
}

function parseNoticeData(notice: any): { title: string; description: string; tag: string } | null {
  if (notice.image_url?.startsWith("json:")) {
    try {
      return JSON.parse(notice.image_url.slice(5));
    } catch { return null; }
  }
  if (notice.button_text) {
    return { title: notice.button_text, description: notice.button_link || "", tag: "" };
  }
  return null;
}

export default function SplashScreen({
  storeName,
  storeBanner,
  storeTagline,
  notices = [],
  socialLinks,
  onContinue,
}: SplashScreenProps) {
  const activeNotices = notices.filter((n) => n.is_active !== false);
  const parsedNotices = activeNotices
    .map((n) => parseNoticeData(n))
    .filter(Boolean) as { title: string; description: string; tag: string }[];

  return (
    <div className="flex flex-col h-dvh bg-[#fafaf9] overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes splashFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .splash-fade { animation: splashFadeUp 0.35s ease both; }
      `}</style>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Hero */}
        <div className="splash-fade text-center px-5 pt-10">
          {/* Logo */}
          <div className="w-[72px] h-[72px] rounded-full mx-auto mb-3 bg-white border border-gray-200 flex items-center justify-center overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
            {storeBanner ? (
              <Image src={storeBanner} alt={storeName} width={72} height={72} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[30px] font-medium text-gray-900" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {storeName?.charAt(0) || "M"}
              </span>
            )}
          </div>

          {/* Store name */}
          <h1 className="text-[20px] font-semibold tracking-tight text-gray-900 leading-tight">
            {storeName}
          </h1>

          {/* Tagline / description */}
          <p className="mt-3 text-[13px] text-gray-500 max-w-[260px] mx-auto leading-relaxed">
            {storeTagline || "Order for pickup or delivery, every day."}
          </p>
        </div>

        {/* Social pills */}
        <div className="splash-fade px-5 mt-3 flex flex-wrap justify-center gap-1.5" style={{ animationDelay: "0.08s" }}>
          {socialLinks?.instagram && (
            <SocialPill icon={<Instagram className="w-3.5 h-3.5" />} label="Instagram" href={socialLinks.instagram} />
          )}
          {socialLinks?.website && (
            <SocialPill icon={<Globe className="w-3.5 h-3.5" />} label="Website" href={socialLinks.website} />
          )}
          {socialLinks?.phone && (
            <SocialPill icon={<Phone className="w-3.5 h-3.5" />} label="Call" href={`tel:${socialLinks.phone}`} />
          )}
        </div>

        {/* Offers & Announcements */}
        {parsedNotices.length > 0 && (
          <div className="splash-fade mt-4" style={{ animationDelay: "0.12s" }}>
            <div className="flex justify-between items-baseline px-5 mb-2">
              <div className="text-[11px] font-semibold tracking-[0.06em] text-gray-500 uppercase">
                Offers & Announcements
              </div>
              {parsedNotices.length > 1 && <div className="text-[11px] text-gray-400">Swipe →</div>}
            </div>
            <div className="flex gap-2.5 overflow-x-auto px-5 scrollbar-hide pb-0.5">
              {parsedNotices.map((notice, i) => (
                <div
                  key={i}
                  className="splash-fade shrink-0 rounded-2xl p-3.5 flex flex-col gap-1.5"
                  style={{
                    animationDelay: `${0.04 * i + 0.12}s`,
                    minWidth: 220,
                    background: i % 2 === 0 ? "#18181b" : "#fff",
                    color: i % 2 === 0 ? "#fff" : "#18181b",
                    border: i % 2 === 0 ? "none" : "1px solid #e7e5e4",
                  }}
                >
                  {notice.tag && (
                    <span
                      className="self-start text-[9px] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded"
                      style={{
                        background: i % 2 === 0 ? "rgba(255,255,255,0.2)" : "#18181b",
                        color: "#fff",
                      }}
                    >
                      {notice.tag}
                    </span>
                  )}
                  <div className="text-[15px] font-semibold tracking-tight leading-snug">
                    {notice.title}
                  </div>
                  {notice.description && (
                    <div className="text-[12px] opacity-75 leading-relaxed">
                      {notice.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info card */}
        <div className="splash-fade px-5 mt-4 pb-4" style={{ animationDelay: "0.2s" }}>
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-col gap-2.5" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
            <div className="flex items-center gap-2.5">
              <Clock className="w-[15px] h-[15px] text-gray-900 shrink-0" />
              <span className="text-[13px] text-gray-900">
                <strong className="font-semibold">Open now</strong> · Order anytime
              </span>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex items-center gap-2.5">
              <MapPin className="w-[15px] h-[15px] text-gray-900 shrink-0" />
              <span className="text-[13px] text-gray-900">
                Delivery & takeaway available
              </span>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex items-center gap-2.5">
              <Star className="w-[14px] h-[14px] shrink-0" fill="#f5a524" stroke="#f5a524" />
              <span className="text-[13px] text-gray-900">
                Rate us on Google
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="shrink-0 px-4 pt-2.5 pb-6 bg-[#fafaf9]/95 backdrop-blur-lg border-t border-gray-100">
        <button
          onClick={onContinue}
          className="splash-fade w-full h-[50px] rounded-[14px] bg-gray-900 text-white font-semibold text-[15px] flex items-center justify-center transition active:scale-[0.98]"
          style={{ animationDelay: "0.25s" }}
        >
          Order Now
        </button>
        <p className="text-center mt-2 text-[10px] text-gray-400">
          By continuing you agree to our Terms & Privacy
        </p>
      </div>
    </div>
  );
}

function SocialPill({ icon, label, href }: { icon: React.ReactNode; label: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-1 h-[30px] px-3 rounded-full border border-gray-200 bg-white text-[12px] font-medium text-gray-600 cursor-pointer transition hover:bg-gray-50">
      {icon}
      {label}
    </div>
  );
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  return content;
}
