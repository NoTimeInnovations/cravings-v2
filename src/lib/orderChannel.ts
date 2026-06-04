/**
 * Distinguish whether the customer is using the website or one of our published
 * native apps (menuthere-user-app-creator) — WITHOUT any change to the published
 * apps. The apps load the same menuthere.com site inside a WebView/WKWebView, so
 * the server can't tell them apart, and the Android app even STRIPS the "wv"
 * token from its User-Agent (so Cashfree shows the UPI-intent UI). So UA, the
 * android-app:// referrer, and display-mode are all unreliable.
 *
 * The reliable signal: the apps inject a native JS bridge named "<Partner>App"
 * (e.g. addJavascriptInterface(..., "OreodemoApp") on Android exposing
 * getNotificationToken(); userContentController.add(..., "OreodemoApp") on iOS →
 * window.webkit.messageHandlers). Neither exists in a normal browser.
 *
 * Detection priority: native bridge → android-app:// referrer (TWA) →
 * standalone display-mode → web. Cached in sessionStorage (NOT localStorage: an
 * in-app WebView can share the browser's localStorage on the device, which would
 * leak the "app" flag into later browser sessions).
 */

const KEY = "mt_order_channel";

export type OrderChannel = "app" | "web";

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mm = window.matchMedia?.bind(window);
  return Boolean(
    mm?.("(display-mode: standalone)").matches ||
      mm?.("(display-mode: fullscreen)").matches ||
      mm?.("(display-mode: minimal-ui)").matches ||
      // iOS Safari "Add to Home Screen"
      (navigator as any)?.standalone === true,
  );
}

/**
 * Detect our native app shell via the injected "<Partner>App" JS bridge. This is
 * the most reliable signal (survives UA stripping) and works for already-published
 * apps with no changes.
 */
function detectNativeAppBridge(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  // Android: addJavascriptInterface registers window.<Name>App with a
  // getNotificationToken() method. Browsers never have such an object.
  try {
    for (const k of Object.getOwnPropertyNames(w)) {
      if (!k.endsWith("App")) continue;
      try {
        const v = w[k];
        if (v && typeof v === "object" && typeof v.getNotificationToken === "function") {
          return true;
        }
      } catch {
        /* property access threw — ignore */
      }
    }
  } catch {
    /* ignore */
  }
  // iOS WKWebView: native message handlers are only present inside an app
  // webview, never in mobile Safari.
  try {
    if (w.webkit?.messageHandlers) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Run as early as possible on first load (root layout) to capture the
 * android-app:// referrer before it's lost to client-side navigation.
 */
export function captureOrderChannel(): void {
  if (typeof window === "undefined") return;
  try {
    // Most reliable: native app JS bridge.
    if (detectNativeAppBridge()) {
      sessionStorage.setItem(KEY, JSON.stringify({ channel: "app", pkg: null }));
      return;
    }
    const ref = document.referrer || "";
    // Launched from an installed Android app (TWA).
    if (ref.startsWith("android-app://")) {
      const pkg = ref.replace("android-app://", "").replace(/\/$/, "");
      sessionStorage.setItem(KEY, JSON.stringify({ channel: "app", pkg }));
      return;
    }
    // Don't downgrade a previously-detected app flag this session.
    if (sessionStorage.getItem(KEY)) return;
    const channel: OrderChannel = detectStandalone() ? "app" : "web";
    sessionStorage.setItem(KEY, JSON.stringify({ channel, pkg: null }));
  } catch {
    /* sessionStorage unavailable — fall back to live detection at read time */
  }
}

/** Read the detected channel (with a live fallback if capture didn't run). */
export function getOrderChannel(): OrderChannel {
  if (typeof window === "undefined") return "web";
  // Live signals first — these are reliable in-app and don't depend on the cache.
  if (detectNativeAppBridge()) return "app";
  try {
    if ((document.referrer || "").startsWith("android-app://")) return "app";
  } catch {
    /* ignore */
  }
  // Cached (captures the android-app:// referrer from first load before SPA nav).
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (v?.channel === "app") return "app";
    }
  } catch {
    /* ignore */
  }
  return detectStandalone() ? "app" : "web";
}
