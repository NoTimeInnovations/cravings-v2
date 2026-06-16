"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cancelOrderAction } from "@/app/actions/cancelOrder";
import { AlertTriangle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderShortId?: string;
  isPetpooja?: boolean;
  onCancelled?: () => void;
}

const QUICK_REASONS = [
  "Customer requested cancellation",
  "Item out of stock",
  "Kitchen closed / overloaded",
  "Duplicate order",
];

export function CancelOrderDialog({
  open,
  onOpenChange,
  orderId,
  orderShortId,
  isPetpooja = false,
  onCancelled,
}: CancelOrderDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const effectiveReason = (selected ?? customReason).trim();

  const reset = () => {
    setSelected(null);
    setCustomReason("");
  };

  const close = () => {
    if (submitting) return;
    reset();
    onOpenChange(false);
  };

  // Esc to close, body scroll lock while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, submitting]);

  const handleSubmit = async () => {
    if (!effectiveReason) {
      toast.error("Please pick or enter a cancellation reason");
      return;
    }
    setSubmitting(true);
    const result = await cancelOrderAction(orderId, effectiveReason);
    setSubmitting(false);

    if (result.success) {
      toast.success("Order cancelled");
      reset();
      onOpenChange(false);
      onCancelled?.();
    } else {
      toast.error(result.message || "Failed to cancel order");
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
          />

          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) close();
            }}
            className={cn(
              "relative z-10 w-full bg-background shadow-2xl",
              "flex flex-col rounded-t-2xl overflow-hidden",
              "max-h-[85svh] sm:max-h-[85vh]",
              "sm:max-w-lg sm:rounded-2xl",
            )}
          >
            <div className="flex justify-center pt-2 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="flex items-start gap-3 px-5 pt-3 pb-4 sm:pt-5 border-b bg-red-50/60 sm:rounded-t-2xl">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 pr-8">
                <h2 className="text-base sm:text-lg font-semibold text-red-900 leading-tight">
                  Cancel order{orderShortId ? ` #${orderShortId}` : ""}?
                </h2>
                <p className="text-xs sm:text-sm text-red-700/80 mt-1">
                  {isPetpooja
                    ? "This cancels the order on Petpooja and marks it as cancelled. The customer will be notified."
                    : "This marks the order as cancelled. The customer will be notified."}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={submitting}
                aria-label="Close"
                className="absolute right-4 top-4 rounded-full p-1 text-red-900/60 hover:bg-red-100 hover:text-red-900 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Pick a reason
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_REASONS.map((r) => {
                    const active = selected === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          setSelected(active ? null : r);
                          if (!active) setCustomReason("");
                        }}
                        className={cn(
                          "group flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition",
                          "hover:border-red-300 hover:bg-red-50/60",
                          active
                            ? "border-red-500 bg-red-50 text-red-900 shadow-sm"
                            : "border-border bg-background text-foreground",
                          submitting && "opacity-60 cursor-not-allowed",
                        )}
                      >
                        <span className="truncate">{r}</span>
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                            active
                              ? "border-red-500 bg-red-500 text-white"
                              : "border-muted-foreground/30 text-transparent",
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Or write your own
                </p>
                <Textarea
                  value={customReason}
                  onChange={(e) => {
                    setCustomReason(e.target.value);
                    if (e.target.value) setSelected(null);
                  }}
                  placeholder="Type a cancellation reason..."
                  rows={3}
                  disabled={submitting}
                  className="resize-none"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  This reason will be shared with the customer.
                </p>
              </div>
            </div>

            <div
              className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t bg-background px-5 py-3"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <Button
                variant="outline"
                onClick={close}
                disabled={submitting}
                className="sm:w-auto w-full"
              >
                Keep order
              </Button>
              <Button
                variant="destructive"
                onClick={handleSubmit}
                disabled={submitting || !effectiveReason}
                className="sm:w-auto w-full"
              >
                {submitting ? "Cancelling..." : "Cancel order"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
