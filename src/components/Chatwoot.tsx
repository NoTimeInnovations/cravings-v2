"use client";

import { useEffect } from "react";

declare global {
    interface Window {
        chatwootSettings?: {
            hideMessageBubble?: boolean;
            position?: "left" | "right";
            locale?: string;
            type?: "standard" | "expanded_bubble";
        };
        chatwootSDK?: {
            run: (config: { websiteToken: string; baseUrl: string }) => void;
        };
        $chatwoot?: any;
    }
}

interface ChatwootProps {
    position?: "left" | "right";
    locale?: string;
    type?: "standard" | "expanded_bubble";
}

const CHATWOOT_TOKEN = process.env.NEXT_PUBLIC_CHATWOOT_ACCESS_TOKEN || "";
const CHATWOOT_URL = process.env.NEXT_PUBLIC_CHATWOOT_URL || "https://app.chatwoot.com/";

export default function Chatwoot({
    position = "right",
    locale = "en",
    type = "standard",
}: ChatwootProps) {
    useEffect(() => {
        // Delay Chatwoot loading by 5 seconds to avoid blocking initial render
        const timer = setTimeout(() => {
            // Prevent duplicate loading
            if (window.$chatwoot) {
                return;
            }

            // Set Chatwoot settings before loading the script
            window.chatwootSettings = {
                hideMessageBubble: false,
                position,
                locale,
                type,
            };

            // Create and load the Chatwoot script
            const baseUrl = CHATWOOT_URL.endsWith('/') ? CHATWOOT_URL : `${CHATWOOT_URL}/`;

            (function (d: Document, t: string) {
                const g = d.createElement(t) as HTMLScriptElement;
                const s = d.getElementsByTagName(t)[0];
                g.src = `${baseUrl}packs/js/sdk.js`;
                g.defer = true;
                g.async = true;
                s.parentNode?.insertBefore(g, s);

                g.onload = function () {
                    window.chatwootSDK?.run({
                        websiteToken: CHATWOOT_TOKEN,
                        baseUrl: baseUrl,
                    });
                };
            })(document, "script");
        }, 5000);

        return () => {
            clearTimeout(timer);
            // Cleanup on unmount
            const chatwootWidget = document.querySelector(".woot-widget-holder");
            if (chatwootWidget) {
                chatwootWidget.remove();
            }
            const chatwootBubble = document.querySelector(".woot--bubble-holder");
            if (chatwootBubble) {
                chatwootBubble.remove();
            }
        };
    }, [position, locale, type]);

    return null;
}
