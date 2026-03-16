"use client";

import { useState, useRef } from "react";
import { ArrowRight, Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — Gemini API inline data limit

export default function MenuUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      setFile(f);
      setSizeError(true);
      setPreview(null);
      return;
    }
    setSizeError(false);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  function clearFile() {
    setFile(null);
    setSizeError(false);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleNext() {
    if (!file) return;

    try {
      // Convert file to base64 to store in sessionStorage
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
        };

        // Store file in sessionStorage
        sessionStorage.setItem("uploaded_menu_file", JSON.stringify(fileData));

        // Navigate to get-started page
        router.push("/get-started?step=1");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing file:", error);
    }
  }

  return (
    <div className="w-full max-w-sm mt-6 flex flex-col items-center gap-4">
      {!preview && !sizeError ? (
        <label
          htmlFor="menu-upload"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files?.[0] || null);
          }}
          className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-orange-600/25 bg-orange-100/10 hover:border-orange-600/50 hover:bg-orange-100/30 transition-all duration-300 py-8 px-6 flex flex-col items-center gap-3"
        >
          <div className="w-11 h-11 rounded-full bg-orange-100/70 flex items-center justify-center">
            <Upload className="w-[18px] h-[18px] text-orange-600" />
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
      ) : sizeError ? (
        <div className="w-full rounded-2xl border-2 border-red-300 bg-red-50 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-red-700 truncate">
              {file?.name}
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              {file && (file.size / 1024 / 1024).toFixed(1)} MB — exceeds 10MB limit
            </p>
          </div>
          <button
            onClick={clearFile}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors duration-200"
          >
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      ) : (
        <div className="w-full rounded-2xl border border-orange-600/15 bg-orange-100/15 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100/60 flex items-center justify-center overflow-hidden flex-shrink-0">
            {file?.type.startsWith("image/") ? (
              <img
                src={preview!}
                alt="Preview"
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <ImageIcon className="w-5 h-5 text-orange-600" />
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
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-orange-100/60 transition-colors duration-200"
          >
            <X className="w-4 h-4 text-stone-400" />
          </button>
        </div>
      )}

      {sizeError && (
        <p className="text-xs text-red-500 text-center">
          Please upload a smaller file (under 10MB) to continue.
        </p>
      )}

      {file && !sizeError && (
        <button
          onClick={handleNext}
          className="group inline-flex items-center gap-3 rounded-full bg-orange-600 pl-6 pr-2 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-all duration-300 ease-in-out"
        >
          Next
          <span className="flex items-center justify-center w-8 h-8 rounded-full border border-white/30 transition-all duration-300">
            <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      )}
    </div>
  );
}
