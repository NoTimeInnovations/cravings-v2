"use client";

import type { QrType } from "@/app/whatsappQr/[id]/page";
import { useState, useEffect } from "react";
import {
  MapPin,
  ArrowRight,
  Sparkles,
  Utensils,
  Clock,
  Zap,
} from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";

const MainPage = ({
  QR,
  thisHotelName,
}: {
  QR: QrType;
  thisHotelName: string;
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const updateQrScanCount = async () => {
    try {

      await fetchFromHasura(
  `
  mutation IncrementQrScan($id: uuid!) {
    update_whatsapp_qr_codes_by_pk(pk_columns: {id: $id}, _inc: {no_of_scans: 1}) {
      no_of_scans
    }
  }
`,
  {
    id: QR.id,
  }
);

      console.log('QR scan count updated successfully')

      const whatsappQrsScanned = JSON.parse(localStorage.getItem(`whatsapp_qrs_scanned`) || "[]");
      localStorage.setItem(`whatsapp_qrs_scanned`, JSON.stringify([...whatsappQrsScanned, QR.id]))

    } catch (err) {
      console.error("Failed to update QR scan count:", err);
    }
  };

  useEffect(() => {
    const whatsappQrsScanned = JSON.parse(localStorage.getItem(`whatsapp_qrs_scanned`) || "[]");
    const isScanned = whatsappQrsScanned.includes(QR.id);

    if (!isScanned) {
      updateQrScanCount();
    }
  }, []);

  return (
    <main className="h-screen max-h-[100dvh] bg-slate-950 relative overflow-hidden flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-green-400/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-teal-400/5 rounded-full blur-2xl animate-bounce delay-500"></div>

        {/* Floating particles - only render after mount */}
        {isMounted &&
          [...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-emerald-400/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
      </div>

      {/* Mouse follower - only show after we have mouse position */}
      {isMounted && mousePosition.x > 0 && mousePosition.y > 0 && (
        <div
          className="fixed w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none transition-all duration-300 ease-out z-10"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        />
      )}

      <div className="relative z-20 w-full max-w-sm sm:max-w-lg flex flex-col h-full justify-center py-4">
        <div className="text-center mb-3 sm:mb-4">
          <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800/30 backdrop-blur-sm rounded-full border border-emerald-500/10">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-emerald-400 animate-pulse" />
            <span className="text-emerald-300 text-xs sm:text-sm font-medium">
              Thank you for visiting {thisHotelName}
            </span>
          </div>
        </div>

        <div className="text-center mb-4 sm:mb-6">
          <div className="relative inline-block mb-4 sm:mb-6 group">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse group-hover:bg-emerald-400/30 transition-all duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-green-400/10 rounded-full blur-2xl animate-spin-slow"></div>
            <img
              src="/icon-192x192.png"
              alt="Group Logo"
              className="relative w-20 h-20 sm:w-28 sm:h-28 mx-auto rounded-full shadow-2xl border-4 border-emerald-500/40 transform hover:scale-110 transition-all duration-500 hover:rotate-12 animate-float"
              style={{
                filter: "drop-shadow(0 0 20px rgba(16, 185, 129, 0.4))",
              }}
            />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-400 rounded-full animate-ping"></div>
          </div>

          <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
            <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800/50 backdrop-blur-sm rounded-full border border-emerald-500/20">
              <Utensils className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-emerald-400" />
              <span className="text-emerald-400 text-xs sm:text-sm font-medium">
                Food Deals Hub
              </span>
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 ml-2 text-emerald-400 animate-pulse" />
            </div>
            <p className="text-gray-300 text-sm sm:text-base font-medium">
              Get instant food offers & deals from {thisHotelName}
            </p>
            <p className="text-gray-400 text-xs sm:text-sm">
              Join now for exclusive restaurant discounts
            </p>
          </div>
        </div>

        <div className="relative group flex-1 flex flex-col justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>

            <div className="relative p-4 sm:p-6">
              <div className="text-center space-y-4 sm:space-y-6">
                <div className="space-y-2 sm:space-y-3">
                  <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent animate-pulse leading-tight">
                    {QR.whatsapp_group.name}
                  </h2>
                  <div className="flex items-center justify-center text-gray-400 text-xs sm:text-sm">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-emerald-400" />
                    {QR.whatsapp_group.location}
                  </div>
                </div>

                <div className="flex justify-center space-x-4 sm:space-x-8 py-3 sm:py-4">
                  <div className="text-center group cursor-pointer">
                    <div className="flex items-center justify-center mb-1 sm:mb-2 p-2 sm:p-3 bg-slate-800/50 rounded-full group-hover:bg-emerald-500/20 transition-all duration-300">
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-xs text-gray-400 group-hover:text-emerald-400 transition-colors">
                      Instant Deals
                    </p>
                  </div>
                  <div className="text-center group cursor-pointer">
                    <div className="flex items-center justify-center mb-1 sm:mb-2 p-2 sm:p-3 bg-slate-800/50 rounded-full group-hover:bg-emerald-500/20 transition-all duration-300">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-xs text-gray-400 group-hover:text-emerald-400 transition-colors">
                      Real-time Updates
                    </p>
                  </div>
                  <div className="text-center group cursor-pointer">
                    <div className="flex items-center justify-center mb-1 sm:mb-2 p-2 sm:p-3 bg-slate-800/50 rounded-full group-hover:bg-emerald-500/20 transition-all duration-300">
                      <Utensils className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-xs text-gray-400 group-hover:text-emerald-400 transition-colors">
                      Food Offers
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-400 rounded-xl blur-sm opacity-75 animate-pulse"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent rounded-xl animate-spin-slow"></div>

                  <a
                    href={QR.whatsapp_group.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block w-full"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                  >
                    <button className="relative w-full h-12 sm:h-16 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white text-base sm:text-lg font-bold rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 group overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"></div>
                      <div className="relative flex items-center justify-center">
                        Join for Food Deals
                        <ArrowRight
                          className={`w-5 h-5 sm:w-6 sm:h-6 ml-2 sm:ml-3 transition-all duration-300 ${
                            isHovered ? "translate-x-2 scale-110" : ""
                          }`}
                        />
                      </div>
                      {isHovered && (
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 animate-pulse"></div>
                      )}
                    </button>
                  </a>
                </div>

                <div className="pt-3 sm:pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-gray-500">
                    Get exclusive restaurant discounts instantly
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-3 sm:mt-4">
          <p className="text-xs text-gray-400">
            Powered by{" "}
            <span className="font-semibold text-emerald-400">Cravings</span>
          </p>
        </div>
      </div>
    </main>
  );
};

export default MainPage;
