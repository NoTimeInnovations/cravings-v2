"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Upload, X, Image as ImageIcon } from "lucide-react";
import { ButtonV2 } from "@/components/ui/ButtonV2";

export default function Hero() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  function clearFile() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="flex items-center justify-center px-5 pb-20 pt-32 md:pt-40 bg-[#fcfbf7]">
      <div className="w-full max-w-2xl mx-auto text-center flex flex-col items-center">
        {/* Heading */}
        <h1 className="geist-font text-3xl sm:text-4xl md:text-[3.25rem] md:leading-[1.15] font-semibold text-gray-900 tracking-tight">
          Create your restaurant&apos;s digital menu in minutes
        </h1>

        {/* Subtitle */}
        <p className="geist-font text-base md:text-lg text-[#544b47] max-w-md mt-5 leading-relaxed">
          Beautiful QR code menus with real-time updates, Google Business sync
          &amp; analytics. No app needed — just scan and order.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3 mt-8">
          <ButtonV2 href="/get-started" variant="primary">
            Start for free
          </ButtonV2>
          <ButtonV2 href="/book-demo" variant="secondary">
            Book a Demo
          </ButtonV2>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full max-w-sm mt-10">
          <div className="flex-1 h-px bg-stone-200" />
          <span className="text-xs text-stone-400 uppercase tracking-wider">
            or
          </span>
          <div className="flex-1 h-px bg-stone-200" />
        </div>

        {/* Upload Menu Section */}
        <div className="w-full max-w-sm mt-6 flex flex-col items-center gap-4">
          {!preview ? (
            <label
              htmlFor="menu-upload"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0] || null);
              }}
              className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-[#B5581A]/25 bg-[#F4E0D0]/10 hover:border-[#B5581A]/50 hover:bg-[#F4E0D0]/30 transition-all duration-300 py-8 px-6 flex flex-col items-center gap-3"
            >
              <div className="w-11 h-11 rounded-full bg-[#F4E0D0]/70 flex items-center justify-center">
                <Upload className="w-[18px] h-[18px] text-[#B5581A]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-800">
                  Upload your menu to get started
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  PNG, JPG or PDF (max 10MB)
                </p>
              </div>
              <input
                ref={inputRef}
                id="menu-upload"
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
              />
            </label>
          ) : (
            <div className="w-full rounded-2xl border border-[#B5581A]/15 bg-[#F4E0D0]/15 p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#F4E0D0]/60 flex items-center justify-center overflow-hidden flex-shrink-0">
                {file?.type.startsWith("image/") ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-[#B5581A]" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {file?.name}
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {file && (file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={clearFile}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F4E0D0]/60 transition-colors duration-200"
              >
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>
          )}

          {file && (
            <button className="group inline-flex items-center gap-3 rounded-full bg-[#B5581A] pl-6 pr-2 py-2 text-sm font-medium text-white hover:bg-[#9a4a15] transition-all duration-300 ease-in-out">
              Next
              <span className="flex items-center justify-center w-8 h-8 rounded-full border border-white/30 transition-all duration-300">
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
