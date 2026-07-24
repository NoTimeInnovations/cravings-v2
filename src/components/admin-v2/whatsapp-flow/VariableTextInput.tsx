"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * A text field (single- or multi-line) with a "#" variable picker: type `#` and
 * a dropdown of the flow's available variables ({{order_id}}, {{store_name}}, …)
 * appears. Keep typing to filter; pick one (click / Enter / Tab) and the `#` plus
 * whatever you typed after it is replaced with `{{variable}}` at the cursor.
 */
export function VariableTextInput({
  value,
  onChange,
  variables,
  multiline = false,
  rows,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  variables: string[];
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [hashIdx, setHashIdx] = React.useState(-1);
  const [active, setActive] = React.useState(0);
  const [pos, setPos] = React.useState<{ left: number; top: number; width: number } | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase();
    return q ? variables.filter((v) => v.toLowerCase().includes(q)) : variables;
  }, [variables, query]);

  const close = React.useCallback(() => {
    setOpen(false);
    setHashIdx(-1);
    setQuery("");
    setActive(0);
  }, []);

  // Detect a `#token` immediately before the caret and (re)open the picker.
  const refresh = (el: HTMLTextAreaElement | HTMLInputElement, text: string) => {
    const caret = el.selectionStart ?? text.length;
    const before = text.slice(0, caret);
    const hi = before.lastIndexOf("#");
    if (hi === -1) return close();
    const q = before.slice(hi + 1);
    // Don't trigger once a space/newline follows the `#`, or if it's inside a word.
    const prev = hi === 0 ? "" : before[hi - 1];
    if (/\s/.test(q) || q.length > 40 || (prev && /\w/.test(prev))) return close();
    const rect = el.getBoundingClientRect();
    setHashIdx(hi);
    setQuery(q);
    setActive(0);
    setPos({ left: rect.left, top: rect.bottom, width: rect.width });
    setOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    onChange(e.target.value);
    refresh(e.target, e.target.value);
  };

  const insert = (v: string) => {
    const el = ref.current;
    if (!el || hashIdx < 0) return;
    const caret = el.selectionStart ?? value.length;
    const token = `{{${v}}}`;
    const next = value.slice(0, hashIdx) + token + value.slice(caret);
    onChange(next);
    close();
    requestAnimationFrame(() => {
      const p = hashIdx + token.length;
      el.focus();
      try {
        el.setSelectionRange(p, p);
      } catch {
        /* input type may not support selection range */
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (filtered.length ? (a + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (filtered.length ? (a - 1 + filtered.length) % filtered.length : 0));
    } else if ((e.key === "Enter" || e.key === "Tab") && filtered.length) {
      e.preventDefault();
      insert(filtered[active] ?? filtered[0]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  const commonProps = {
    ref: ref as any,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    // Close after the field loses focus, but delayed so a click on a menu item
    // (which the menu's onMouseDown already keeps from blurring) still lands.
    onBlur: () => window.setTimeout(close, 150),
    placeholder,
    className,
  };

  return (
    <>
      {multiline ? (
        <Textarea rows={rows} {...commonProps} />
      ) : (
        <Input {...commonProps} />
      )}
      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top + 4,
              width: Math.max(pos.width, 200),
              zIndex: 9999,
            }}
            className="max-h-56 overflow-y-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-md"
            // Keep the field focused so the click's insert() runs before blur.
            onMouseDown={(e) => e.preventDefault()}
          >
            {filtered.length === 0 ? (
              <div className="px-2.5 py-1.5 text-xs text-muted-foreground">
                {variables.length === 0
                  ? "No variables for this flow yet"
                  : "No matching variables"}
              </div>
            ) : (
              filtered.map((v, i) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insert(v)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "block w-full px-2.5 py-1.5 text-left font-mono text-xs",
                    i === active ? "bg-accent text-accent-foreground" : "text-foreground",
                  )}
                >
                  {`{{${v}}}`}
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
