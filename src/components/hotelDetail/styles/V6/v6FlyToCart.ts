// Imperative "fly to cart" animation for the V6 ("Grocery") style — clones the
// tapped product image and animates it into the top cart pill (id="v6-cart-target"),
// then bumps the pill. Client-only, no React. Respects prefers-reduced-motion.

const CART_TARGET_ID = "v6-cart-target";

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function bumpCart(target: HTMLElement) {
  if (typeof target.animate !== "function") return;
  target.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.28)" }, { transform: "scale(1)" }],
    { duration: 380, easing: "cubic-bezier(.2,.7,.3,1)" },
  );
}

/** Fly a clone of `sourceImg` into the cart pill. `sourceImg` may be the <img> or
 *  a wrapper containing one. `targetId` lets callers aim at a different cart pill
 *  (e.g. the search overlay's own FAB, since the main one is hidden behind it).
 *  Safe to call when the target/source is missing. */
export function flyToCart(
  sourceImg: HTMLElement | null | undefined,
  targetId: string = CART_TARGET_ID,
) {
  if (typeof document === "undefined" || !sourceImg) return;
  const target = document.getElementById(targetId);
  if (!target) return;

  if (prefersReducedMotion()) {
    bumpCart(target);
    return;
  }

  const imgEl =
    sourceImg instanceof HTMLImageElement ? sourceImg : sourceImg.querySelector("img");
  const src = (imgEl as HTMLImageElement | null)?.currentSrc || (imgEl as HTMLImageElement | null)?.src;
  const s = sourceImg.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  if (!s.width || !s.height) return;

  const clone = document.createElement("div");
  // Initial state — NO transition yet, explicit identity transform. The
  // transition is added only AFTER a forced reflow commits this state, so the
  // very first animation fires (rAF-only nudges intermittently skip frame 1).
  clone.style.cssText = [
    "position:fixed",
    `left:${s.left}px`,
    `top:${s.top}px`,
    `width:${s.width}px`,
    `height:${s.height}px`,
    "border-radius:18px",
    "overflow:hidden",
    "z-index:99999",
    "pointer-events:none",
    "will-change:transform,opacity",
    "box-shadow:0 10px 30px rgba(0,0,0,.22)",
    "transform:translate(0px,0px) scale(1)",
    "opacity:1",
  ].join(";");
  if (src) {
    const im = document.createElement("img");
    im.src = src;
    im.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
    clone.appendChild(im);
  } else {
    clone.style.background = "#e5e7eb";
  }
  document.body.appendChild(clone);

  const tx = t.left + t.width / 2 - (s.left + s.width / 2);
  const ty = t.top + t.height / 2 - (s.top + s.height / 2);

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clone.remove();
    bumpCart(target);
  };

  // Force a synchronous reflow so the initial transform is committed to the
  // rendering, THEN enable the transition and set the target transform — this
  // guarantees the animation runs on the first invocation too.
  void clone.getBoundingClientRect();
  clone.style.transition =
    "transform .72s cubic-bezier(.35,.8,.25,1), opacity .72s ease-in";
  clone.style.transform = `translate(${tx}px, ${ty}px) scale(0.1)`;
  clone.style.opacity = "0.35";

  clone.addEventListener("transitionend", finish, { once: true });
  window.setTimeout(finish, 900); // fallback if transitionend never fires
}
