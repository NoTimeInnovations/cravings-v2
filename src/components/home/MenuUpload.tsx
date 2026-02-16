"use client";

import { useState, useRef } from "react";
import { ArrowRight, Upload, X, Image as ImageIcon } from "lucide-react";

export default function MenuUpload() {
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
  );
}
