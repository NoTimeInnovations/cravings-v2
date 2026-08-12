"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  autoLoginFromOrderToken,
  type OrderLinkLoginResult,
} from "@/app/actions/autoLoginFromOrderToken";
import { useAuthStore } from "@/store/authStore";

/**
 * Mounted on the storefront (and the table/QR page) when a WhatsApp order-link
 * token carries a customer identity.
 *
 * Two outcomes, decided by the server action:
 *
 *  • Nobody signed in → the session is established silently. No UI. This is the
 *    overwhelmingly common path: WhatsApp opens links in its own in-app browser
 *    with its own cookie jar.
 *
 *  • Someone ELSE signed in → we render a confirmation instead of switching.
 *    That gesture is the whole security property. An order-link token is not a
 *    secret — anyone can mint one bound to their own number by messaging the
 *    store — so a link that switched sessions on sight would let a forwarded URL
 *    silently sign an owner out of admin and into the sender's account. See the
 *    doc comment on autoLoginFromOrderToken.
 *
 * The sheet is hand-rolled rather than the shared <Dialog>: it has to render
 * above every storefront layout (five menu variants, each with its own overlays
 * and z-index budget) before hydration settles, and it must not depend on a
 * portal root that a given layout may not have mounted yet.
 */
export default function OrderLinkAutoLogin({
  partnerId,
  token,
}: {
  partnerId: string;
  token: string;
}) {
  const router = useRouter();
  const ran = useRef(false);
  const [ask, setAsk] = useState<
    Extract<OrderLinkLoginResult, { status: "needs_confirm" }> | null
  >(null);
  const [switching, setSwitching] = useState(false);
  const [failed, setFailed] = useState(false);

  const finish = useCallback(async () => {
    try {
      await useAuthStore.getState().fetchUser();
    } catch {
      /* store will re-fetch on next mount */
    }
    router.refresh();
  }, [router]);

  // "I already said no" — remembered per token for this tab only. ?olt= stays in
  // the URL, so without this a decline would be re-asked on every client-side
  // navigation inside the storefront (picking a category remounts this).
  // sessionStorage, not a cookie: it must not outlive the tab, and it must not
  // be readable as a signal by anything else.
  const declinedKey = `olt-declined:${token.slice(-24)}`;
  const decline = useCallback(() => {
    try {
      sessionStorage.setItem(declinedKey, "1");
    } catch {
      /* private mode — worst case we ask again */
    }
    setAsk(null);
  }, [declinedKey]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    try {
      if (sessionStorage.getItem(declinedKey)) return;
    } catch {
      /* no sessionStorage — fall through and ask */
    }
    (async () => {
      const res = await autoLoginFromOrderToken(partnerId, token);
      if (res.status === "ok") return finish();
      if (res.status === "needs_confirm") setAsk(res);
    })();
  }, [partnerId, token, finish, declinedKey]);

  // Escape dismisses, which means "stay signed in" — the safe side. There is no
  // key that CONFIRMS: switching accounts should cost a deliberate tap.
  useEffect(() => {
    if (!ask) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") decline();
    };
    window.addEventListener("keydown", onKey);
    // Stop the storefront scrolling behind the sheet on iOS.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [ask, decline]);

  const confirm = async () => {
    if (switching) return;
    setSwitching(true);
    const res = await autoLoginFromOrderToken(partnerId, token, { confirmed: true });
    if (res.status === "ok") {
      // Stay up (in the "Switching…" state) until the client store has caught up
      // with the new cookie. Tearing the sheet down first exposes a live, usable
      // menu that is still holding the PREVIOUS account in useAuthStore — an
      // order placed in that window would be written to the wrong person.
      await finish();
      setAsk(null);
      return;
    }
    // Token expired between the prompt and the tap, or the account vanished.
    // Say so rather than silently dismissing — otherwise the sheet just vanishes
    // and they carry on, still on the wrong account, with no idea why.
    setSwitching(false);
    setFailed(true);
  };

  if (!ask) return null;

  // "••••3210" when we know the number. Kept SHORT: it appears in the heading and
  // again on the button, and a long phrase there wrapped the button to three
  // lines on a 375px screen.
  //
  // When the number is unknown the copy has to change SHAPE, not just swap a
  // noun — "this ordering link belongs to this link's customer" says nothing.
  const known = !!ask.maskedPhone;
  const who = ask.maskedPhone ?? "";
  const heading = known ? `Continue as ${who}?` : "Switch to this link's account?";
  const primaryLabel = known ? `Continue as ${who}` : "Switch account";
  const belongsTo = known
    ? `This ordering link belongs to ${who}`
    : "This ordering link belongs to someone else";

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="olt-switch-title"
      // Declining is the safe default, so a stray tap on the backdrop or Escape
      // both mean "stay signed in". Only the button switches.
      onClick={(e) => {
        if (e.target === e.currentTarget) decline();
      }}
    >
      {/* max-h + scroll: on a 375px phone the storefront onboarding sheet is
          already up, and a long store name pushed the second button off the
          bottom of the screen where it could not be reached. */}
      <div className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900">
        <h2
          id="olt-switch-title"
          className="text-base font-semibold text-neutral-900 dark:text-neutral-100"
        >
          {heading}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          This device is signed in as{" "}
          <span className="font-medium text-neutral-800 dark:text-neutral-200">
            {ask.currentLabel}
          </span>
          . {belongsTo}
          {ask.currentIsStaff
            ? " — continuing signs you out of the dashboard here."
            : "."}
        </p>

        {failed && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            That link has expired. Message the store on WhatsApp for a fresh one.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={confirm}
            disabled={switching}
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {switching ? "Switching…" : primaryLabel}
          </button>
          <button
            type="button"
            onClick={decline}
            autoFocus
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
