import type { RefObject } from "react";

/**
 * Wait for the Cashfree embed container div to be mounted in the DOM before
 * cashfree.checkout() mounts its iframe into it. A single requestAnimationFrame
 * can fire before React has committed the mount on slow WebViews (the cause of
 * the "Checkout container not ready" error). Polls a few frames before giving up.
 *
 * Returns the element once available, or null after the timeout.
 */
export async function waitForCashfreeContainer(
  ref: RefObject<HTMLDivElement | null>,
  timeoutMs = 2000,
): Promise<HTMLDivElement | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (ref.current) return ref.current;
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  }
  return ref.current ?? null;
}
