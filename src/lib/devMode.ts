// Dev mode flag — persisted in localStorage so it survives navigation,
// reloads, tab closes and browser restarts on a given device.
//
// Behaviour (see /signup-from-google OTP skip):
//   - Visiting any URL with ?dev=1  => turns dev mode ON  (idempotent, not a toggle)
//   - Visiting any URL with ?dev=0  => turns dev mode OFF (OTP required again)
//   - Once ON, every later visit (even with no ?dev param) stays ON until ?dev=0.

const DEV_MODE_KEY = "dev_mode";

export function isDevModeOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEV_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDevMode(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(DEV_MODE_KEY, "1");
    else window.localStorage.removeItem(DEV_MODE_KEY);
  } catch {
    /* storage may be disabled */
  }
}
