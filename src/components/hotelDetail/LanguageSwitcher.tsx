"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { MENU_LANGUAGES } from "@/lib/menuLanguages";

declare global {
    interface Window {
        googleTranslateElementInit?: () => void;
        google?: any;
        __gtReactPatched?: boolean;
    }
}

function currentLangFromCookie(): string {
    if (typeof document === "undefined") return "en";
    const m = document.cookie.match(/googtrans=([^;]+)/);
    if (!m) return "en";
    // cookie looks like "/en/hi"
    const parts = decodeURIComponent(m[1]).split("/");
    return parts[2] || "en";
}

/**
 * Google Translate–powered language switcher for the storefront. Rendered as a
 * fixed button so it appears on every menu layout when the partner enables it in
 * store settings. Picking a language auto-translates the whole menu on the fly.
 */
export function LanguageSwitcher({
    enabled,
    languages,
    accent = "#ea580c",
}: {
    enabled: boolean;
    languages?: string[]; // configured codes; empty/undefined = offer all
    accent?: string;
}) {
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState("en");
    const initedRef = useRef(false);

    // Dropdown = the partner's chosen languages, always including English (the
    // base / reset). Empty config → offer the full list.
    const offered = useMemo(() => {
        const codes = new Set(
            languages && languages.length ? languages : MENU_LANGUAGES.map((l) => l.code),
        );
        codes.add("en");
        return MENU_LANGUAGES.filter((l) => codes.has(l.code));
    }, [languages]);

    useEffect(() => {
        if (!enabled || initedRef.current || typeof window === "undefined") return;
        initedRef.current = true;
        setCurrent(currentLangFromCookie());

        // Google Translate rewrites text nodes into <font> wrappers; React can then
        // throw on removeChild/insertBefore when it re-renders those nodes. Guard the
        // two DOM ops so translation and React coexist (well-known workaround).
        if (!window.__gtReactPatched && typeof Node === "function" && Node.prototype) {
            window.__gtReactPatched = true;
            const origRemove = Node.prototype.removeChild;
            Node.prototype.removeChild = function (this: any, child: any) {
                if (child.parentNode !== this) return child;
                return origRemove.apply(this, arguments as any) as any;
            } as any;
            const origInsert = Node.prototype.insertBefore;
            Node.prototype.insertBefore = function (this: any, newNode: any, refNode: any) {
                if (refNode && refNode.parentNode !== this) return newNode;
                return origInsert.apply(this, arguments as any) as any;
            } as any;
        }

        const included = offered.map((l) => l.code).join(",");
        window.googleTranslateElementInit = () => {
            try {
                new window.google.translate.TranslateElement(
                    { pageLanguage: "en", includedLanguages: included, autoDisplay: false },
                    "google_translate_element",
                );
            } catch {
                /* widget init failed — button will retry the combo lookup */
            }
        };

        if (!document.getElementById("google-translate-script")) {
            const s = document.createElement("script");
            s.id = "google-translate-script";
            s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
            s.async = true;
            document.body.appendChild(s);
        }

        // Hide Google's injected top banner / tooltip and the yellow highlight.
        if (!document.getElementById("gt-hide-style")) {
            const st = document.createElement("style");
            st.id = "gt-hide-style";
            st.textContent = `
                .goog-te-banner-frame, .skiptranslate > iframe { display: none !important; }
                body { top: 0 !important; position: static !important; }
                #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
                .goog-text-highlight { background: none !important; box-shadow: none !important; }
                font { background: none !important; box-shadow: none !important; }
            `;
            document.head.appendChild(st);
        }
    }, [enabled]);

    if (!enabled) return null;

    const setLang = (code: string) => {
        setOpen(false);
        setCurrent(code);
        // Mark the URL so the storefront splash won't reappear if the switch (or a
        // later reload) re-mounts the page.
        try {
            const url = new URL(window.location.href);
            if (url.searchParams.get("back") !== "true") {
                url.searchParams.set("back", "true");
                window.history.replaceState({}, "", url.toString());
            }
        } catch {
            /* ignore */
        }
        if (code === "en") {
            // Reset to the original: clear Google's cookie and reload.
            const host = window.location.hostname;
            const expire = "expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = `googtrans=; ${expire}`;
            document.cookie = `googtrans=; ${expire} domain=${host};`;
            document.cookie = `googtrans=; ${expire} domain=.${host};`;
            window.location.reload();
            return;
        }
        const trigger = () => {
            const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
            if (combo) {
                combo.value = code;
                combo.dispatchEvent(new Event("change"));
                return true;
            }
            return false;
        };
        if (!trigger()) {
            // Widget not ready yet — poll briefly until the combo exists.
            let n = 0;
            const id = setInterval(() => {
                if (trigger() || ++n > 25) clearInterval(id);
            }, 150);
        }
    };

    const currentLabel = MENU_LANGUAGES.find((l) => l.code === current)?.label ?? "English";

    return (
        <>
            <div id="google_translate_element" className="hidden" aria-hidden="true" />
            <div className="notranslate fixed bottom-20 right-4 z-[9998]" translate="no">
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-label="Change language"
                    title={currentLabel}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/5 transition active:scale-95"
                    style={{ color: accent }}
                >
                    <Globe className="h-5 w-5" />
                </button>
                {open && (
                    <>
                        <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} />
                        <div className="absolute bottom-full right-0 mb-2 max-h-[60vh] w-44 overflow-y-auto rounded-xl border bg-white p-1 shadow-lg">
                            {offered.map((l) => (
                                <button
                                    key={l.code}
                                    type="button"
                                    onClick={() => setLang(l.code)}
                                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
                                >
                                    {l.label}
                                    {current === l.code && (
                                        <Check className="h-4 w-4" style={{ color: accent }} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

export default LanguageSwitcher;
