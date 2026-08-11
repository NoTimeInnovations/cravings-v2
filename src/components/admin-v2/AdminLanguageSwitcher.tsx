"use client";

import { useEffect, useRef, useState } from "react";
import { MENU_LANGUAGES } from "@/lib/menuLanguages";

/**
 * Google Translate bootstrap + language setter for the admin dashboard.
 *
 * A hook rather than a component: the navbar renders the language list as a
 * submenu of its overflow menu, so there is no standalone button to own.
 *
 * ── Why a separate component from the storefront's <LanguageSwitcher> ────────
 *
 * That one is wired into storefront concerns: it drives useMenuLanguageStore (so
 * menu prices swap between Latin and native currency symbols), stamps ?back=true
 * so the storefront splash doesn't reappear, and ships CSS that hides V3's
 * secondary-title element. None of that means anything here, and the storefront
 * switcher is live on real menus — re-shaping it to serve two very different
 * surfaces risks a working thing to save ~40 lines.
 *
 * ── What Google Translate actually does, and the two consequences ────────────
 *
 * It rewrites text nodes into <font> wrappers in place. Two things follow:
 *
 * 1. React can then throw on removeChild/insertBefore when it re-renders a node
 *    Google has replaced. The guard below is the standard workaround. It is a
 *    GLOBAL patch on Node.prototype, so it also silences those two DOM errors
 *    everywhere else in the tab — that is the price, and it only gets installed
 *    once a partner actually picks a language.
 *
 * 2. It translates EVERYTHING it is allowed to, including the partner's own
 *    data — dish names, customer names, addresses. Anything that must stay
 *    verbatim needs translate="no" (or class="notranslate") on it or an
 *    ancestor. Printed tickets are safe by construction: /kot and /bill are
 *    separate routes that never mount this, and the widget only translates
 *    pages that load its script — the googtrans cookie alone does nothing.
 */

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
    return decodeURIComponent(m[1]).split("/")[2] || "en";
}

export function useAdminTranslate() {
    const [current, setCurrent] = useState("en");
    const initedRef = useRef(false);

    useEffect(() => {
        if (initedRef.current || typeof window === "undefined") return;
        initedRef.current = true;
        setCurrent(currentLangFromCookie());

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

        const included = MENU_LANGUAGES.map((l) => l.code).join(",");
        window.googleTranslateElementInit = () => {
            try {
                new window.google.translate.TranslateElement(
                    { pageLanguage: "en", includedLanguages: included, autoDisplay: false },
                    "admin_google_translate_element",
                );
            } catch {
                /* widget init failed — setLang polls for the combo and retries */
            }
        };

        if (!document.getElementById("google-translate-script")) {
            const s = document.createElement("script");
            s.id = "google-translate-script";
            s.src =
                "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
            s.async = true;
            document.body.appendChild(s);
        }

        // Google injects a top banner that shoves the whole page down by ~40px,
        // which breaks the sticky admin header. Hide it and pin body position.
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
    }, []);

    const setLang = (code: string) => {
        setCurrent(code);

        if (code === "en") {
            // Reset: clear googtrans and reload. Cleared at every domain level —
            // Google may set it on the registrable domain rather than the exact
            // host, and clearing only the host leaves the page translated.
            const expire = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
            const host = window.location.hostname;
            const clearFor = (domain?: string) => {
                document.cookie = `googtrans=; ${expire}; path=/;${domain ? ` domain=${domain};` : ""}`;
            };
            clearFor();
            const parts = host.split(".");
            for (let i = 0; i < parts.length - 1; i++) {
                const d = parts.slice(i).join(".");
                clearFor(d);
                clearFor(`.${d}`);
            }
            clearFor(host);
            clearFor(`.${host}`);
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
            let n = 0;
            const id = setInterval(() => {
                if (trigger() || ++n > 25) clearInterval(id);
            }, 150);
        }
    };

    return { current, setLang };
}
