// One funnel for opening the print routes (/kot/<id>, /bill/<id>).
//
// The point of this module is WHEN the tabs are created. A browser only grants
// a popup while the transient user activation from the click is still live, so
// a `window.open` that runs after an `await` (every payment-method chooser in
// admin does exactly that) is blocked outright on WebKit and flaky on Chrome.
// So we claim the tabs synchronously inside the click, then do the awaited work,
// then navigate tabs we already own — navigating your own window needs no
// activation at all.
//
// KOT and bill stay TWO documents on purpose: they usually go to different
// printers (kitchen vs counter) and most thermal drivers cut per job, so
// merging them into one route would staple the kitchen ticket to the customer's
// receipt. The desktop print app also drives these same routes with
// `?print=false&w=<px>` and scrapes the payload each page logs — unchanged here.

import { toast } from "sonner";

export type PrintDoc = "kot" | "bill";

const DOC_PATH: Record<PrintDoc, (orderId: string) => string> = {
  kot: (id) => `/kot/${id}`,
  bill: (id) => `/bill/${id}`,
};

const DOC_LABEL: Record<PrintDoc, string> = { kot: "KOT", bill: "bill" };

type Claimed = { doc: PrintDoc; win: Window | null };

/** Open a blank tab NOW, to be navigated later. Must run inside the click. */
function claim(doc: PrintDoc): Claimed {
  let win: Window | null = null;
  try {
    win = window.open("", "_blank");
  } catch {
    win = null;
  }
  // A blocked popup is null in Chrome/Safari, but some blockers hand back a
  // stub that is already closed — treat both as "did not get a window".
  if (win && !win.closed) {
    try {
      win.document.write(
        `<title>Printing ${DOC_LABEL[doc]}…</title>` +
          `<body style="font:14px system-ui;padding:24px;color:#555">Preparing ${DOC_LABEL[doc]}…</body>`,
      );
      win.document.close();
    } catch {
      /* the placeholder is cosmetic */
    }
  }
  return { doc, win: win && !win.closed ? win : null };
}

export interface PrintOrderOptions {
  /** Documents to print, in the order they should come up. Default: KOT, then bill. */
  docs?: PrintDoc[];
  /**
   * Work that must finish BEFORE the tabs are navigated — e.g. recording the
   * payment method. It runs after the tabs are already claimed, so awaiting it
   * cannot cost you the popup. Put the mutation here, never also in the caller.
   */
  before?: () => Promise<unknown>;
  /** Stagger between documents (ms) so the two print dialogs don't race. */
  staggerMs?: number;
}

/**
 * Print the KOT and the bill for one order from a single click.
 *
 * Deliberately NOT an async function: the `window.open` calls have to run in
 * the same task as the click. Never add an `await` above the claim block — pass
 * the awaited work in as `before` instead.
 */
export function printKotAndBill(
  orderId: string,
  { docs = ["kot", "bill"], before, staggerMs = 700 }: PrintOrderOptions = {},
): Promise<void> {
  if (typeof window === "undefined" || !orderId || docs.length === 0) {
    return Promise.resolve();
  }

  // ── synchronous phase: spend the user activation ──────────────────────────
  const claimed = docs.map(claim);

  // ── async phase: activation no longer matters ─────────────────────────────
  const ready = before ? Promise.resolve().then(before) : Promise.resolve();

  return ready.then(
    () => {
      claimed.forEach((c, i) => {
        if (!c.win || c.win.closed) return;
        const url = DOC_PATH[c.doc](orderId);
        // replace(), not href: the about:blank placeholder shouldn't become a
        // history entry in a tab whose only job is to print.
        if (i === 0) {
          c.win.location.replace(url);
        } else {
          window.setTimeout(() => {
            if (c.win && !c.win.closed) c.win.location.replace(url);
          }, staggerMs * i);
        }
      });
      warnIfBlocked(orderId, claimed);
    },
    (err) => {
      // The awaited work failed — close the tabs we opened speculatively so
      // nobody is left staring at "Preparing bill…".
      claimed.forEach((c) => {
        try {
          c.win?.close();
        } catch {
          /* ignore */
        }
      });
      throw err;
    },
  );
}

/**
 * iOS Safari and the fullscreen PWA grant roughly ONE popup per gesture, so the
 * second document is the usual casualty. Say so, and leave a way through: a
 * toast action click is a fresh gesture, which is never blocked. Mirrors the
 * auto-print warning in orderStore.
 */
function warnIfBlocked(orderId: string, claimed: Claimed[]) {
  const blocked = claimed.filter((c) => !c.win || c.win.closed);
  if (blocked.length === 0) return;

  const labels = blocked.map((b) => DOC_LABEL[b.doc]).join(" and ");
  toast.warning(`Allow pop-ups to print the ${labels} too.`, {
    duration: 15000,
    action: {
      label: `Print ${labels}`,
      onClick: () => printKotAndBill(orderId, { docs: blocked.map((b) => b.doc) }),
    },
  });
}

/** Single-document wrappers, so existing bare window.open call sites can migrate
 *  onto the same blocked-popup handling. */
export const printKot = (orderId: string, opts: Omit<PrintOrderOptions, "docs"> = {}) =>
  printKotAndBill(orderId, { ...opts, docs: ["kot"] });

export const printBill = (orderId: string, opts: Omit<PrintOrderOptions, "docs"> = {}) =>
  printKotAndBill(orderId, { ...opts, docs: ["bill"] });
