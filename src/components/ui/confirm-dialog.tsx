"use client";

// Promise-based replacement for the browser's native confirm() / prompt().
//
// Native dialogs are unstyled, block the main thread, are suppressed outright
// in some embedded/PWA webviews, and cannot be themed — so an admin action
// could silently do nothing. These render through the app's own AlertDialog.
//
// Deliberately IMPERATIVE rather than a hook + context provider: the call sites
// are inside plain event handlers and async store actions, and admin-v2
// components are mounted from more than one route (/admin-v2 and /captain), so
// a provider would have to be threaded into each. <ConfirmDialogHost /> is
// mounted once in the root layout next to <Toaster />, the same way toasts work.
//
// Migration is a near drop-in — the only requirement is that the enclosing
// function is async:
//     if (!confirm("Delete this?")) return;
//     if (!(await confirmDialog("Delete this?"))) return;

import * as React from "react";
import { create } from "zustand";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ConfirmOptions {
  /** Heading. Defaults to "Are you sure?" (or "Confirm" when a description is absent). */
  title?: string;
  /** Body copy — this is where a native confirm()'s message belongs. */
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** Red confirm button, for deletes and other irreversible actions. */
  destructive?: boolean;
}

export interface PromptOptions extends ConfirmOptions {
  placeholder?: string;
  defaultValue?: string;
  /** Block confirming while the field is empty. Default true. */
  required?: boolean;
}

type Mode = "confirm" | "prompt";

interface DialogState {
  open: boolean;
  mode: Mode;
  options: PromptOptions;
  resolve: ((value: boolean | string | null) => void) | null;
  ask: (mode: Mode, options: PromptOptions) => Promise<boolean | string | null>;
  settle: (value: boolean | string | null) => void;
}

const useConfirmStore = create<DialogState>((set, get) => ({
  open: false,
  mode: "confirm",
  options: {},
  resolve: null,

  ask: (mode, options) => {
    // If something is already open, treat it as dismissed rather than leaving
    // its promise dangling forever.
    const prev = get().resolve;
    if (prev) prev(mode === "prompt" ? null : false);

    return new Promise((resolve) => {
      set({ open: true, mode, options, resolve });
    });
  },

  settle: (value) => {
    const { resolve } = get();
    set({ open: false, resolve: null });
    resolve?.(value);
  },
}));

/** Ask the user to confirm. Resolves true only if they accept. */
export function confirmDialog(
  optionsOrMessage: ConfirmOptions | string,
): Promise<boolean> {
  const options =
    typeof optionsOrMessage === "string"
      ? { description: optionsOrMessage }
      : optionsOrMessage;
  return useConfirmStore
    .getState()
    .ask("confirm", options) as Promise<boolean>;
}

/** Ask the user for a value. Resolves null if they cancel. */
export function promptDialog(
  optionsOrMessage: PromptOptions | string,
): Promise<string | null> {
  const options =
    typeof optionsOrMessage === "string"
      ? { description: optionsOrMessage }
      : optionsOrMessage;
  return useConfirmStore
    .getState()
    .ask("prompt", options) as Promise<string | null>;
}

/**
 * Mounted ONCE, in the root layout. Renders whatever the imperative helpers
 * above have queued.
 */
export function ConfirmDialogHost() {
  const open = useConfirmStore((s) => s.open);
  const mode = useConfirmStore((s) => s.mode);
  const options = useConfirmStore((s) => s.options);
  const settle = useConfirmStore((s) => s.settle);

  const [value, setValue] = React.useState("");

  // Reset the field each time a prompt opens, so a previous answer never
  // bleeds into the next question.
  React.useEffect(() => {
    if (open) setValue(options.defaultValue ?? "");
  }, [open, options.defaultValue]);

  const isPrompt = mode === "prompt";
  const required = options.required !== false;
  const canSubmit = !isPrompt || !required || value.trim().length > 0;

  const cancel = () => settle(isPrompt ? null : false);
  const accept = () => {
    if (!canSubmit) return;
    settle(isPrompt ? value.trim() : true);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Escape / overlay dismissal reads as a cancel.
        if (!next) cancel();
      }}
    >
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {options.title ?? (options.description ? "Are you sure?" : "Confirm")}
          </AlertDialogTitle>
          {options.description ? (
            <AlertDialogDescription className="whitespace-pre-line">
              {options.description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>

        {isPrompt && (
          <Input
            autoFocus
            value={value}
            placeholder={options.placeholder}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                accept();
              }
            }}
          />
        )}

        {/* Plain Buttons rather than AlertDialogAction/Cancel: those close the
            dialog themselves, which fights the store owning `open` and would
            also let a disabled-but-clicked prompt dismiss without a value. */}
        <AlertDialogFooter>
          <Button variant="outline" onClick={cancel}>
            {options.cancelText ?? "Cancel"}
          </Button>
          <Button
            variant={options.destructive ? "destructive" : "default"}
            disabled={!canSubmit}
            onClick={accept}
          >
            {options.confirmText ?? (options.destructive ? "Delete" : "Confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
