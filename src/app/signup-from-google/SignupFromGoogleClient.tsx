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
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  quickSignupFromGoogle,
  type ExtractedMenuItem,
} from "@/app/actions/quickSignupFromGoogle";
import { extractMenuFromFiles } from "@/lib/menu/menuExtraction";

// Generous per-file cap. Menu pages are downscaled + re-compressed before they
// ever reach the AI, so this only bounds the original upload; it's set high so a
// partner can drop in full multi-page PDFs without hitting a wall.
const MAX_MENU_SIZE = 50 * 1024 * 1024; // 50MB per file

const STEPS = [
  "Reading your Google listing...",
  "Pulling photos and reviews...",
  "Generating your site...",
  "Almost there...",
];

type View = "choose" | "email" | "building";

export default function SignupFromGoogleClient({
  placeId,
  placeName,
  sessionToken,
  googleError,
  googleEmail,
  fromGoogle,
}: {
  placeId: string;
  placeName: string;
  sessionToken?: string;
  googleError?: string;
  googleEmail?: string;
  fromGoogle?: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("choose");
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Optional menu upload — supports multiple files. Each file <= 10MB.
  // Stored in sessionStorage["uploaded_menu_files"] as a JSON array so a
  // future digitisation step can pick them all up.
  const [menuFiles, setMenuFiles] = useState<File[]>([]);
  const [oversizedFiles, setOversizedFiles] = useState<File[]>([]);
  // Optional custom AI instruction for menu extraction (highest priority).
  // Persisted alongside the files so it survives the Google OAuth round-trip.
  const [menuInstruction, setMenuInstruction] = useState("");
  const menuInputRef = useRef<HTMLInputElement>(null);

  // Optional logo — saved to store_banner (the V3 hero logo) with size + bg
  // tile in storefront_settings.bannerLogo. Persisted in sessionStorage so it
  // survives the Google OAuth round-trip, like the uploaded menu files.
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");
  const [logoScale, setLogoScale] = useState<number>(100);
  const [logoBgColor, setLogoBgColor] = useState<string>("#ffffff");
  const logoInputRef = useRef<HTMLInputElement>(null);

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

  // Best-effort persistence so the upload survives the Google-OAuth bounce.
  // Large uploads can exceed the sessionStorage quota — that's fine: on the
  // email path (no reload) the files still live in React state, so we swallow
  // the error instead of failing the upload.
  const persistMenuFiles = async (files: File[]) => {
    try {
      if (files.length === 0) {
        sessionStorage.removeItem("uploaded_menu_files");
        return;
      }
      const items = await Promise.all(files.map(readFileToBase64));
      sessionStorage.setItem("uploaded_menu_files", JSON.stringify(items));
    } catch {
      /* quota exceeded or storage disabled — keep going, state holds the files */
    }
  };

  const handleMenuInstructionChange = (value: string) => {
    setMenuInstruction(value);
    try {
      if (value.trim()) sessionStorage.setItem("uploaded_menu_instruction", value);
      else sessionStorage.removeItem("uploaded_menu_instruction");
    } catch {
      /* storage disabled — ignore */
    }
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
      // Persistence is best-effort (see persistMenuFiles); the files are already
      // in state, so a storage failure never blocks the upload.
      await persistMenuFiles(next);
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

  const persistLogo = (dataUrl: string, scale: number, bgColor: string) => {
    try {
      if (!dataUrl) {
        sessionStorage.removeItem("uploaded_logo");
        return;
      }
      sessionStorage.setItem(
        "uploaded_logo",
        JSON.stringify({ dataUrl, scale, bgColor }),
      );
    } catch {
      /* storage disabled — ignore */
    }
  };

  // Logo payload for quickSignupFromGoogle. Read from sessionStorage so it
  // works after the Google OAuth bounce (React state is reset on that reload).
  const readLogoPayload = (): {
    logo?: string;
    logoScale?: number;
    logoBgColor?: string;
  } => {
    try {
      const raw = sessionStorage.getItem("uploaded_logo");
      if (!raw) return {};
      const o = JSON.parse(raw);
      if (!o?.dataUrl) return {};
      return { logo: o.dataUrl, logoScale: o.scale, logoBgColor: o.bgColor };
    } catch {
      return {};
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (logoInputRef.current) logoInputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file for your logo");
      return;
    }
    if (file.size > MAX_MENU_SIZE) {
      toast.error("Logo must be under 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoDataUrl(dataUrl);
      persistLogo(dataUrl, logoScale, logoBgColor);
    };
    reader.onerror = () => toast.error("Could not read that image");
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoDataUrl("");
    persistLogo("", logoScale, logoBgColor);
  };

  useEffect(() => {
    if (googleError) {
      toast.error("Google sign-in didn't complete. Try again or use email.");
    }
  }, [googleError]);

  useEffect(() => {
    try {
      const savedInstruction = sessionStorage.getItem("uploaded_menu_instruction");
      if (savedInstruction) setMenuInstruction(savedInstruction);
    } catch {
      /* ignore */
    }
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

  // Restore a logo picked before the Google OAuth bounce.
  useEffect(() => {
    const p = readLogoPayload();
    if (p.logo) {
      setLogoDataUrl(p.logo);
      if (typeof p.logoScale === "number") setLogoScale(p.logoScale);
      if (typeof p.logoBgColor === "string") setLogoBgColor(p.logoBgColor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          sessionToken,
          email: googleEmail,
          extractedItems: items,
          ...readLogoPayload(),
        });
        clearInterval(stepTimer);
        try {
          sessionStorage.removeItem("gbp_signup_place");
          sessionStorage.removeItem("uploaded_menu_files");
          sessionStorage.removeItem("uploaded_menu_instruction");
          sessionStorage.removeItem("uploaded_logo");
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

  // Email path: no verification code. As soon as a valid email is entered we
  // digitise the menu and create the account straight away.
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error("Enter a valid email address");
    }
    await buildSite(email);
  };

  // Run menu extraction + quick signup, then redirect. Used by the email path
  // (which now creates the account immediately, with no verification code).
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
        sessionToken,
        email: signupEmail,
        extractedItems: items,
        ...readLogoPayload(),
      });
      clearInterval(stepTimer);
      try {
        sessionStorage.removeItem("gbp_signup_place");
        sessionStorage.removeItem("uploaded_menu_files");
        sessionStorage.removeItem("uploaded_menu_instruction");
        sessionStorage.removeItem("uploaded_logo");
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
    // The custom instruction may have been typed before the OAuth bounce, so
    // fall back to sessionStorage when state is empty after the redirect.
    let instruction = menuInstruction;
    if (!instruction.trim()) {
      try {
        instruction = sessionStorage.getItem("uploaded_menu_instruction") || "";
      } catch {
        /* ignore */
      }
    }
    try {
      // Handles many files + PDFs: PDFs are split into page images and all pages
      // are sent to the AI in size-bounded batches so the request limit is never
      // hit. Partial batch failures still return whatever was read.
      const result = await extractMenuFromFiles(files, {
        model: "gemini-2.5-flash",
        extraContext: instruction.trim() || undefined,
      });
      if (result.items.length === 0 && result.failedBatches > 0) {
        toast.error(
          "We couldn't read your menu — you can add items later in your dashboard.",
        );
      }
      return result.items as ExtractedMenuItem[];
    } catch (err) {
      console.error("menu extraction failed", err);
      return [];
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
                Add your menu and logo (optional), then continue to create your
                site.
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
                      PNG, JPG or multi-page PDF · as many pages as you like ·
                      we&apos;ll digitise them for you
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

              {/* Optional custom AI instruction — highest priority when we
                  digitise the menu. Only relevant once a menu file is added. */}
              {menuFiles.length > 0 && (
                <div className="mb-4 rounded-xl border border-[#e8d2c1] bg-gradient-to-br from-[#fdf5ee] to-white p-3.5">
                  <label
                    htmlFor="signup-menu-instruction"
                    className="flex items-center gap-2 text-sm font-semibold text-[#1a1410]"
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-[#fbe6d6] shrink-0">
                      <Sparkles className="w-[14px] h-[14px] text-[#a23717]" />
                    </span>
                    Custom instruction for the AI
                    <span className="text-stone-400 font-normal">(optional)</span>
                  </label>
                  <p className="mt-1 text-xs text-stone-500">
                    Tell us anything special about your menu — we&apos;ll follow it
                    first. E.g. &quot;Ignore all drinks&quot;, &quot;Prices are in
                    ₹&quot;, &quot;Treat Combos as a category&quot;.
                  </p>
                  <textarea
                    id="signup-menu-instruction"
                    value={menuInstruction}
                    onChange={(e) => handleMenuInstructionChange(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Ignore the drinks section and only extract food items…"
                    className="mt-2 w-full resize-none rounded-lg border border-[#e8d2c1] bg-white px-3 py-2 text-sm text-[#1a1410] placeholder:text-stone-400 focus:border-[#a23717]/50 focus:outline-none focus:ring-1 focus:ring-[#a23717]/30"
                  />
                </div>
              )}

              {/* Optional logo — becomes the storefront hero logo */}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
              {!logoDataUrl ? (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="group flex w-full items-center gap-3 cursor-pointer rounded-xl border border-dashed border-[#e8d2c1] bg-white hover:border-[#a23717]/40 hover:bg-[#fdf5ee]/60 transition-colors px-3.5 py-3 mb-4 text-left"
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#fbe6d6] shrink-0">
                    <ImageIcon className="w-[18px] h-[18px] text-[#a23717]" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-[#1a1410]">
                      Add your logo{" "}
                      <span className="text-stone-400 font-normal">
                        (optional)
                      </span>
                    </span>
                    <span className="block text-xs text-stone-500 mt-0.5">
                      Shown on your storefront · PNG or JPG
                    </span>
                  </span>
                </button>
              ) : (
                <div className="mb-4 space-y-3 rounded-xl border border-[#e8d2c1] bg-[#fdf5ee] px-3.5 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200"
                      style={{ background: logoBgColor || "#ffffff" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoDataUrl}
                        alt="Logo preview"
                        className="h-full w-full object-contain"
                        style={{
                          transform: `scale(${Math.min(5, Math.max(0.5, logoScale / 100))})`,
                        }}
                      />
                    </div>
                    <span className="flex-1 text-sm font-medium text-[#1a1410]">
                      Logo added
                    </span>
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="text-stone-400 hover:text-red-600 shrink-0"
                      aria-label="Remove logo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="logo-size" className="text-xs text-stone-500">
                        Size (%)
                      </Label>
                      <Input
                        id="logo-size"
                        type="number"
                        min={50}
                        max={500}
                        step={5}
                        value={logoScale}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          const next = Number.isFinite(v)
                            ? Math.min(500, Math.max(50, v))
                            : 100;
                          setLogoScale(next);
                          persistLogo(logoDataUrl, next, logoBgColor);
                        }}
                        className="h-9 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="logo-bg" className="text-xs text-stone-500">
                        Background
                      </Label>
                      <div className="flex h-9 items-center gap-2 rounded-md border border-stone-200 bg-white px-2">
                        <input
                          id="logo-bg"
                          type="color"
                          value={logoBgColor || "#ffffff"}
                          onChange={(e) => {
                            setLogoBgColor(e.target.value);
                            persistLogo(logoDataUrl, logoScale, e.target.value);
                          }}
                          className="h-6 w-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                        <span className="text-xs text-stone-600">
                          {logoBgColor || "#ffffff"}
                        </span>
                      </div>
                    </div>
                  </div>
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
            <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                  What&apos;s your email?
                </h1>
                <p className="text-sm text-stone-500 mt-2">
                  We&apos;ll create your site right away — no code to enter.
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
                    Creating your site...
                  </>
                ) : (
                  "Create my site"
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
