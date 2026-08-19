"use client";

import * as React from "react";
import { CornerDownLeft, Search } from "lucide-react";

import { cn } from "@/lib/utils";

import { SEARCH_ENTRIES, searchEntries, type SearchEntry } from "./searchIndex";

/**
 * The ⌘K palette.
 *
 * Two-stage navigation: an entry knows which SCREEN its text lives on, the
 * palette switches to it, and then `revealText` finds the text in the rendered
 * DOM and flashes it. That is what makes a result land on the field rather than
 * merely on the right tab — without giving several hundred labels their own ids.
 *
 * Screens are lazy chunks that mount a frame or two after the view changes, and
 * settings sections read their deep-link params at mount, so the reveal retries
 * for a short window instead of looking once and giving up.
 */

const FLASH_MS = 1600;

/** Walk the rendered page for `text` and scroll it into view, briefly ringed. */
function revealText(text: string, deadline: number) {
  const needle = text.trim().toLowerCase();
  if (!needle) return;

  const tick = () => {
    const main = document.querySelector("main") ?? document.body;
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    // Exact first, then a containing match — several labels are built from a
    // template ("Round the total to the nearest rupee"), so the indexed text is
    // only ever a prefix of what is actually rendered.
    let hit: HTMLElement | null = null;
    let loose: HTMLElement | null = null;
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const text = node.textContent?.trim().toLowerCase();
      if (!text) continue;
      if (text === needle) {
        hit = node.parentElement;
        if (hit) break;
      } else if (!loose && text.length < 120 && text.includes(needle)) {
        loose = node.parentElement;
      }
    }
    hit = hit ?? loose;

    if (!hit) {
      // setTimeout, not requestAnimationFrame: rAF is paused entirely while the
      // tab is hidden or throttled, which would leave the reveal silently doing
      // nothing. A timer keeps retrying regardless of paint.
      if (Date.now() < deadline) window.setTimeout(tick, 60);
      return;
    }

    hit.scrollIntoView({ behavior: "smooth", block: "center" });
    // Inline styles, not a class: the target is arbitrary markup that may already
    // carry its own ring/outline utilities, and a class would lose that race.
    const prev = hit.style.cssText;
    hit.style.borderRadius = "6px";
    hit.style.outline = "2px solid rgb(161 161 170)";
    hit.style.outlineOffset = "3px";
    hit.style.transition = "outline-color 400ms ease";
    window.setTimeout(() => {
      hit!.style.cssText = prev;
    }, FLASH_MS);
  };

  window.setTimeout(tick, 0);
}

export function AdminV3Search({
  open,
  onOpenChange,
  onGo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Switch the shell to this entry's screen. */
  onGo: (entry: SearchEntry) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Empty query shows the screens rather than nothing — the palette doubles as
  // a jump list, which is most of what it gets used for.
  const results = React.useMemo(
    () => (query.trim() ? searchEntries(query) : SEARCH_ENTRIES.slice(0, 8)),
    [query],
  );

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // Focus after the dialog mounts, or the caret lands nowhere.
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  React.useEffect(() => setActive(0), [query]);

  const choose = (entry: SearchEntry) => {
    onOpenChange(false);
    onGo(entry);
    // Give the lazy screen chunk time to mount before hunting for the text.
    revealText(entry.label, Date.now() + 4000);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-zinc-950/40 p-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Search settings and screens"
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 dark:border-zinc-800">
          <Search className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                choose(results[active]);
              } else if (e.key === "Escape") {
                onOpenChange(false);
              }
            }}
            placeholder="Search settings and screens…"
            className="h-12 min-w-0 flex-1 border-0 bg-transparent text-[14px] text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
          <kbd className="shrink-0 rounded border border-zinc-200 px-1.5 py-0.5 text-[10.5px] font-medium text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
             esc
          </kbd>
        </div>

        <div className="max-h-[46vh] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
              Nothing matches “{query}”.
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.view}-${r.sg ?? ""}-${r.ss ?? ""}-${r.label}-${i}`}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
                  i === active
                    ? "bg-zinc-100 dark:bg-zinc-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium leading-tight text-zinc-950 dark:text-zinc-50">
                    {r.label}
                  </div>
                  <div className="mt-0.5 truncate text-[12px] leading-tight text-zinc-400 dark:text-zinc-500">
                    {r.crumb}
                  </div>
                </div>
                {i === active ? (
                  <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
