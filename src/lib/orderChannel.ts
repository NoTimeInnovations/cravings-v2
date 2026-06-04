/**
 * Distinguish whether the customer is using the website or one of our published
 * TWA Android apps (com.<username>.twa) — WITHOUT any change to the published
 * apps. The TWA loads the same menuthere.com site in Chrome, so server-side
 * User-Agent can't tell them apart. Two client-side signals can:
 *
 *  1. `document.referrer === "android-app://<package>"` — Chrome sets this when
 *     a page is opened inside a TWA. It's only present on the FIRST load of the
 *     launch, so we capture it immediately on mount and cache it.
 *  2. display-mode standalone/fullscreen/minimal-ui — a TWA always runs in its
 *     manifest display mode (ours is fullscreen); a normal browser tab is
 *     "browser". This is live on every page, so it's the fallback at order time.
 *
 * Cached in sessionStorage (NOT localStorage: a TWA shares Chrome's localStorage
 * on the device, which would leak the "app" flag into later browser sessions;
 * sessionStorage is scoped to the session/tab).
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
 * Run as early as possible on first load (root layout) to capture the
 * android-app:// referrer before it's lost to client-side navigation.
 */
export function captureOrderChannel(): void {
  if (typeof window === "undefined") return;
  try {
    const ref = document.referrer || "";
    // Definitive: launched from an installed Android app (our TWA).
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
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (v?.channel === "app" || v?.channel === "web") return v.channel;
    }
  } catch {
    /* ignore */
  }
  // Not cached — compute live.
  try {
    if ((document.referrer || "").startsWith("android-app://")) return "app";
  } catch {
    /* ignore */
  }
  return detectStandalone() ? "app" : "web";
}
