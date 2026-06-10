"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  MapPin,
  ArrowLeft,
  FileUp,
  FileText,
  X,
  AlertCircle,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendOtp, verifyOtp } from "@/app/actions/sendOtp";
import {
  quickSignupFromGoogle,
  type ExtractedMenuItem,
} from "@/app/actions/quickSignupFromGoogle";
import { aiGenerate, fileToBase64 } from "@/lib/ai/generateContent";
import { isDevModeOn } from "@/lib/devMode";
import type { Schema } from "@google/generative-ai";

const MAX_MENU_SIZE = 10 * 1024 * 1024; // 10MB — Gemini inline-data limit

const MENU_EXTRACTION_SCHEMA: Schema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      name: { type: "string" },
      price: { type: "number" },
      description: { type: "string" },
      category: { type: "string" },
      variants: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            price: { type: "number" },
          },
          required: ["name", "price"],
        },
      },
    },
    required: ["name", "price", "description", "category"],
  },
} as Schema;

const MENU_EXTRACTION_PROMPT = `Extract each distinct dish as a separate item from the provided menu files (images or PDFs).
For each item, provide:
- name: The name of the dish.
- price: The minimum price.
- description: A short, appetizing description (max 10 words).
- category: The main heading.
- variants: (Optional) Array of {name, price} for sizes.`;

const STEPS = [
  "Reading your Google listing...",
  "Pulling photos and reviews...",
  "Generating your site...",
  "Almost there...",
];

type View = "choose" | "email" | "otp" | "building";

export default function SignupFromGoogleClient({
  placeId,
  placeName,
  googleError,
  googleEmail,
  fromGoogle,
  dev,
}: {
  placeId: string;
  placeName: string;
  googleError?: string;
  googleEmail?: string;
  fromGoogle?: boolean;
  dev?: boolean;
}) {
  const router = useRouter();
  // Dev mode is ON if the URL said so (?dev=1) OR it's persisted in localStorage.
  // Resolved on mount to avoid an SSR/client hydration mismatch.
  const [devMode, setDevModeState] = useState<boolean>(!!dev);
  useEffect(() => {
    if (dev || isDevModeOn()) setDevModeState(true);
  }, [dev]);
  const [view, setView] = useState<View>("choose");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Optional menu upload — supports multiple files. Each file <= 10MB.
  // Stored in sessionStorage["uploaded_menu_files"] as a JSON array so a
  // future digitisation step can pick them all up.
  const [menuFiles, setMenuFiles] = useState<File[]>([]);
  const [oversizedFiles, setOversizedFiles] = useState<File[]>([]);
  const menuInputRef = useRef<HTMLInputElement>(null);

  const readFileToBase64 = (f: File) =>
    new Promise<{ name: string; type: string; size: number; data: string }>(
      (resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve({
            name: f.name,
            type: f.type,
            size: f.size,
            data: reader.result as string,
          });
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(f);
      },
    );

  const persistMenuFiles = async (files: File[]) => {
    if (files.length === 0) {
      sessionStorage.removeItem("uploaded_menu_files");
      return;
    }
    const items = await Promise.all(files.map(readFileToBase64));
    sessionStorage.setItem("uploaded_menu_files", JSON.stringify(items));
  };

  const handleAddFiles = async (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const valid: File[] = [];
    const oversized: File[] = [];
    Array.from(incoming).forEach((f) => {
      if (f.size > MAX_MENU_SIZE) oversized.push(f);
      else valid.push(f);
    });
    if (oversized.length) {
      setOversizedFiles((prev) => [...prev, ...oversized]);
    }
    if (valid.length) {
      const next = [...menuFiles, ...valid];
      setMenuFiles(next);
      try {
        await persistMenuFiles(next);
      } catch (err) {
        console.error(err);
        toast.error("Couldn't read one of your files. Try a smaller one.");
      }
    }
    if (menuInputRef.current) menuInputRef.current.value = "";
  };

  const removeMenuFile = async (idx: number) => {
    const next = menuFiles.filter((_, i) => i !== idx);
    setMenuFiles(next);
    try {
      await persistMenuFiles(next);
    } catch {
      /* ignore */
    }
  };

  const removeOversizedFile = (idx: number) => {
    setOversizedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    if (googleError) {
      toast.error("Google sign-in didn't complete. Try again or use email.");
    }
  }, [googleError]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("uploaded_menu_files");
      if (!raw) return;
      const items = JSON.parse(raw) as Array<{
        name: string;
        type: string;
        size: number;
        data: string;
      }>;
      Promise.all(
        items.map((it) =>
          fetch(it.data)
            .then((r) => r.blob())
            .then((b) => new File([b], it.name, { type: it.type })),
        ),
      )
        .then(setMenuFiles)
        .catch(() => {
          /* corrupt blob — ignore */
        });
    } catch {
      /* storage disabled or bad JSON — ignore */
    }
  }, []);

  // Guardrail: if someone lands here without a placeId, send them home.
  useEffect(() => {
    if (!placeId) {
      toast.error("Pick your business first.");
      router.replace("/");
    }
  }, [placeId, router]);

  // After Google OAuth, the callback bounces back here with from_google=1
  // and the verified google_email. Pick up the uploaded menu (if any) from
  // sessionStorage and finish the signup client-side.
  const hasAutoRunRef = useRef(false);
  useEffect(() => {
    if (!fromGoogle || !googleEmail || !placeId) return;
    if (hasAutoRunRef.current) return;
    hasAutoRunRef.current = true;

    setEmail(googleEmail);
    setView("building");

    const stepTimer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 2500);

    (async () => {
      try {
        const items = await extractMenuItems();
        const result = await quickSignupFromGoogle({
          placeId,
          email: googleEmail,
          extractedItems: items,
        });
        clearInterval(stepTimer);
        try {
          sessionStorage.removeItem("gbp_signup_place");
          sessionStorage.removeItem("uploaded_menu_files");
        } catch {}
        window.location.assign(result.redirectUrl);
      } catch (e) {
        clearInterval(stepTimer);
        console.error("from_google build failed", e);
        toast.error(
          e instanceof Error ? e.message : "Could not finish signup",
        );
        setView("choose");
      }
    })();

    return () => clearInterval(stepTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromGoogle, googleEmail, placeId]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error("Enter a valid email address");
    }
    // Dev mode (?dev=1 or persisted): skip OTP verification entirely and build directly.
    if (devMode) {
      await buildSite(email);
      return;
    }
    setIsSending(true);
    try {
      const res = await sendOtp(email);
      if (!res.success) throw new Error(res.error || "Could not send code");
      toast.success(`Code sent to ${email}`);
      setView("otp");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setIsSending(false);
    }
  };

  // Run menu extraction + quick signup, then redirect. Shared by the verified
  // (post-OTP) flow and the dev flow that skips OTP.
  const buildSite = async (signupEmail: string) => {
    setIsSending(true);
    setView("building");
    const stepTimer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 2500);
    try {
      const items = await extractMenuItems();
      const result = await quickSignupFromGoogle({
        placeId,
        email: signupEmail,
        extractedItems: items,
      });
      clearInterval(stepTimer);
      try {
        sessionStorage.removeItem("gbp_signup_place");
        sessionStorage.removeItem("uploaded_menu_files");
      } catch {}
      window.location.assign(result.redirectUrl);
    } catch (err) {
      clearInterval(stepTimer);
      toast.error(
        err instanceof Error ? err.message : "Could not finish signup",
      );
      setView("email");
    } finally {
      setIsSending(false);
    }
  };

  // Hydrate menu File[] from sessionStorage (multi-file array), then run
  // Gemini via the same /api/ai/generate endpoint that /get-started uses
  // and return the extracted item JSON for the server action.
  const extractMenuItems = async (): Promise<ExtractedMenuItem[]> => {
    let files: File[] = menuFiles;
    if (files.length === 0) {
      try {
        const raw = sessionStorage.getItem("uploaded_menu_files");
        if (raw) {
          const items = JSON.parse(raw) as Array<{
            name: string;
            type: string;
            data: string;
          }>;
          files = await Promise.all(
            items.map((it) =>
              fetch(it.data)
                .then((r) => r.blob())
                .then((b) => new File([b], it.name, { type: it.type })),
            ),
          );
        }
      } catch {
        return [];
      }
    }
    if (files.length === 0) return [];
    try {
      const inputs = await Promise.all(
        files.map(async (f) => ({
          data: await fileToBase64(f),
          mimeType: f.type,
        })),
      );
      const text = await aiGenerate({
        model: "gemini-2.5-flash-lite",
        prompt: MENU_EXTRACTION_PROMPT,
        responseMimeType: "application/json",
        responseSchema: MENU_EXTRACTION_SCHEMA,
        files: inputs,
      });
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? (parsed as ExtractedMenuItem[]) : [];
    } catch (err) {
      console.error("menu extraction failed", err);
      return [];
    }
  };

  const handleVerifyAndBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("Enter the 6-digit code");
    setIsSending(true);
    try {
      const verify = await verifyOtp(email, otp);
      if (!verify.success) {
        throw new Error(verify.error || "Verification failed");
      }
      setView("building");
      const stepTimer = setInterval(() => {
        setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
      }, 2500);
      try {
        const items = await extractMenuItems();
        const result = await quickSignupFromGoogle({
          placeId,
          email,
          extractedItems: items,
        });
        clearInterval(stepTimer);
        try {
          sessionStorage.removeItem("gbp_signup_place");
          sessionStorage.removeItem("uploaded_menu_files");
        } catch {}
        window.location.assign(result.redirectUrl);
      } catch (e2) {
        clearInterval(stepTimer);
        throw e2;
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not finish signup",
      );
      setView("otp");
    } finally {
      setIsSending(false);
    }
  };

  const handleGoogle = () => {
    const params = new URLSearchParams({
      context: "gbp-signup",
      placeId,
    });
    window.location.href = `/api/auth/google?${params.toString()}`;
  };

  return (
    <div className="min-h-[100dvh] bg-[#fcfbf7] px-5 py-16 flex items-start justify-center">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {placeName && (
          <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 flex items-start gap-3">
            <MapPin className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-orange-700 mb-0.5">
                Building site for
              </p>
              <p className="text-sm font-medium text-stone-900 truncate">
                {placeName}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          {view === "choose" && (
            <>
              <h1 className="geist-font text-2xl font-semibold text-gray-900 tracking-tight">
                Almost there
              </h1>
              <p className="text-sm text-stone-500 mt-2 mb-5">
                Add your menu (optional) and verify your identity.
              </p>

              <input
                ref={menuInputRef}
                id="signup-menu-upload"
                type="file"
                multiple
                accept="image/png,image/jpeg,application/pdf"
                className="hidden"
                onChange={(e) => handleAddFiles(e.target.files)}
              />

              {menuFiles.length === 0 && oversizedFiles.length === 0 ? (
                <label
                  htmlFor="signup-menu-upload"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleAddFiles(e.dataTransfer.files);
                  }}
                  className="group flex items-center gap-3 cursor-pointer rounded-xl border border-dashed border-[#e8d2c1] bg-white hover:border-[#a23717]/40 hover:bg-[#fdf5ee]/60 transition-colors px-3.5 py-3 mb-4"
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#fbe6d6] shrink-0">
                    <FileUp className="w-[18px] h-[18px] text-[#a23717]" />
                  </span>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-sm font-semibold text-[#1a1410]">
                      Add your menu{" "}
                      <span className="text-stone-400 font-normal">
                        (optional)
                      </span>
                    </span>
                    <span className="block text-xs text-stone-500 mt-0.5">
                      PNG, JPG or PDF · up to 10MB each · we&apos;ll digitise
                      them for you
                    </span>
                  </span>
                </label>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleAddFiles(e.dataTransfer.files);
                  }}
                  className="space-y-2 mb-4"
                >
                  {menuFiles.map((f, idx) => (
                    <div
                      key={`${f.name}-${idx}`}
                      className="flex items-center gap-3 rounded-xl border border-[#e8d2c1] bg-[#fdf5ee] px-3.5 py-3"
                    >
                      <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#fbe6d6] shrink-0">
                        <FileText className="w-[18px] h-[18px] text-[#a23717]" />
                      </span>
                      <span className="flex-1 min-w-0 text-left">
                        <span className="block text-sm font-semibold text-[#1a1410] truncate">
                          {f.name}
                        </span>
                        <span className="block text-xs text-stone-500 mt-0.5">
                          {(f.size / 1024 / 1024).toFixed(2)} MB · ready to
                          digitise
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMenuFile(idx)}
                        className="text-stone-400 hover:text-stone-700 shrink-0"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {oversizedFiles.map((f, idx) => (
                    <div
                      key={`oversized-${f.name}-${idx}`}
                      className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3"
                    >
                      <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-red-200 shrink-0">
                        <AlertCircle className="w-[18px] h-[18px] text-red-500" />
                      </span>
                      <span className="flex-1 min-w-0 text-left">
                        <span className="block text-sm font-semibold text-red-700 truncate">
                          {f.name}
                        </span>
                        <span className="block text-xs text-red-500 mt-0.5">
                          {(f.size / 1024 / 1024).toFixed(1)} MB — over 10MB
                          limit
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeOversizedFile(idx)}
                        className="text-red-400 hover:text-red-700 shrink-0"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <label
                    htmlFor="signup-menu-upload"
                    className="flex items-center justify-center gap-2 cursor-pointer rounded-xl border border-dashed border-[#e8d2c1] bg-white hover:border-[#a23717]/40 hover:bg-[#fdf5ee]/60 transition-colors px-3.5 py-2.5 text-[13px] font-medium text-[#a23717]"
                  >
                    <FileUp className="w-4 h-4" />
                    Add another file
                  </label>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogle}
                className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white text-sm font-medium text-stone-800 hover:bg-stone-50 transition-colors"
              >
                <FcGoogle className="text-xl" />
                Continue with Google
              </button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-stone-400">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setView("email")}
                className="w-full h-11 flex items-center justify-center gap-3 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
              >
                <Mail className="h-4 w-4" />
                Continue with email
              </button>
            </>
          )}

          {view === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <button
                type="button"
                onClick={() => setView("choose")}
                className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
              <div>
                <h1 className="geist-font text-2xl font-semibold text-gray-900 tracking-tight">
                  Verify your email
                </h1>
                <p className="text-sm text-stone-500 mt-2">
                  We&apos;ll send you a 6-digit code.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  placeholder="you@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl border-stone-200 bg-stone-50 px-4 focus-visible:ring-orange-600/30 focus-visible:border-orange-600/50"
                />
              </div>
              <button
                type="submit"
                disabled={isSending}
                className="w-full h-11 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  "Send code"
                )}
              </button>
            </form>
          )}

          {view === "otp" && (
            <form onSubmit={handleVerifyAndBuild} className="space-y-4">
              <button
                type="button"
                onClick={() => setView("email")}
                className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900"
              >
                <ArrowLeft className="h-3 w-3" />
                Change email
              </button>
              <div>
                <h1 className="geist-font text-2xl font-semibold text-gray-900 tracking-tight">
                  Enter the code
                </h1>
                <p className="text-sm text-stone-500 mt-2">
                  Sent to{" "}
                  <span className="font-medium text-stone-900">{email}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">6-digit code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="123456"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="h-11 rounded-xl border-stone-200 bg-stone-50 px-4 text-center tracking-[0.4em] text-lg font-medium focus-visible:ring-orange-600/30 focus-visible:border-orange-600/50"
                />
              </div>
              <button
                type="submit"
                disabled={isSending || otp.length !== 6}
                className="w-full h-11 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify and build my site"
                )}
              </button>
            </form>
          )}

          {view === "building" && (
            <div className="text-center py-6 space-y-4">
              <Loader2 className="h-7 w-7 animate-spin mx-auto text-orange-600" />
              <p className="text-sm text-stone-700 font-medium">
                {STEPS[stepIndex]}
              </p>
              <p className="text-xs text-stone-400">
                Fetching data, generating content, and uploading photos. This
                takes a few seconds.
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-stone-400 text-center mt-6">
          By continuing you agree to Menuthere&apos;s terms.
        </p>
      </div>
    </div>
  );
}
