"use client";

import * as React from "react";

/**
 * Meta Embedded Signup — connect a WhatsApp Business number to a partner.
 *
 * Lifted out of admin-v2's IntegrationsSettings so admin-v3 runs the SAME flow
 * rather than a paraphrase of it. Three things here are load-bearing and easy
 * to get subtly wrong:
 *
 *  1. The SDK is preloaded on mount. FB.login has to run synchronously inside
 *     the user's click — awaiting anything first breaks the gesture chain and
 *     the popup is blocked, at which point Meta falls back to a full redirect.
 *  2. FB.login rejects an async callback outright ("Expression is of type
 *     asyncfunction, not function"), so the callback stays sync and the token
 *     exchange runs in a helper.
 *  3. For the WhatsApp Business app (Coexistence) flow, the WABA and phone
 *     number IDs arrive ONLY via a postMessage from the popup — the access
 *     token is scoped to whatsapp_business_manage_events and carries no WABA.
 *     The origin check is a hostname SUFFIX match on facebook.com / fb.com,
 *     because on mobile the popup is served from m.facebook.com and an exact
 *     www/web/business allowlist silently dropped the message on phones.
 */
export function useWhatsAppEmbeddedSignup({
  partnerId,
  onConnected,
}: {
  partnerId?: string;
  onConnected: () => void | Promise<void>;
}) {
  const [connecting, setConnecting] = React.useState(false);
  const sessionRef = React.useRef<{ waba_id?: string; phone_number_id?: string }>({});

  React.useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!appId) return;
    const w = window as any;
    if (w.__fbSdkReady || w.__fbSdkInitStarted) return;
    w.__fbSdkInitStarted = true;

    w.fbAsyncInit = () => {
      w.FB.init({ appId, cookie: true, xfbml: false, version: "v21.0" });
      w.__fbSdkReady = true;
    };

    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      document.body.appendChild(script);
    }
  }, []);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      let host: string;
      try {
        host = new URL(event.origin).hostname;
      } catch {
        return;
      }
      const fromFacebook =
        host === "facebook.com" ||
        host.endsWith(".facebook.com") ||
        host === "fb.com" ||
        host.endsWith(".fb.com");
      if (!fromFacebook) return;
      try {
        const parsed =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (parsed?.type === "WA_EMBEDDED_SIGNUP" && parsed?.data) {
          const { waba_id, phone_number_id } = parsed.data;
          if (waba_id || phone_number_id) {
            sessionRef.current = { waba_id, phone_number_id };
          }
        }
      } catch {
        /* not an Embedded Signup message */
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /** Must be called straight from a click handler — see (1) above. */
  const connect = React.useCallback(
    (onError?: (message: string) => void) => {
      if (!partnerId) return;
      const w = window as any;
      if (!w.__fbSdkReady) {
        onError?.("WhatsApp connector is still loading — try again in a moment.");
        return;
      }

      const exchange = async (code: string) => {
        setConnecting(true);
        try {
          const session = sessionRef.current;
          const res = await fetch("/api/whatsapp/meta/auth/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              partnerId,
              waba_id: session.waba_id,
              phone_number_id: session.phone_number_id,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.connected) {
            onError?.(data?.error || "WhatsApp connection failed");
            return;
          }
          await onConnected();
        } catch (e) {
          onError?.((e as Error)?.message || "WhatsApp connection failed");
        } finally {
          setConnecting(false);
          sessionRef.current = {};
        }
      };

      w.FB.login(
        (response: any) => {
          if (!response?.authResponse) {
            onError?.("WhatsApp connection was cancelled");
            return;
          }
          void exchange(response.authResponse.code);
        },
        {
          config_id: process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID,
          response_type: "code",
          override_default_response_type: true,
          extras: {
            setup: {},
            // Coexistence: partners link the number they already run on the
            // WhatsApp Business app. These four mirror Meta's working hosted
            // onboarding URL.
            featureType: "whatsapp_business_app_onboarding",
            sessionInfoVersion: "3",
            version: "v4",
            features: [{ name: "app_only_install" }],
          },
        },
      );
    },
    [partnerId, onConnected],
  );

  return { connect, connecting };
}
