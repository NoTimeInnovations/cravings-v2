/**
 * True when the dashboard is running inside the Cravings desktop app (Electron)
 * rather than an ordinary browser tab.
 *
 * Used to keep the new-order alarm desktop-only: the desktop app is the counter
 * appliance that is meant to make noise, while the same dashboard opened in a
 * browser should stay silent (visual toasts still show in both).
 *
 * Two independent markers — either is enough:
 *  - `window.api`, exposed by the desktop preload via contextBridge. Survives
 *    any user-agent change.
 *  - `Electron/<version>` in the user agent, which the app also carries as
 *    `cravings-desktop/<version>`.
 */
export function isDesktopApp(): boolean {
  if (typeof window === "undefined") return false; // SSR / prerender
  try {
    if ((window as unknown as { api?: unknown }).api) return true;
    return /\bElectron\//.test(window.navigator?.userAgent ?? "");
  } catch {
    return false;
  }
}
