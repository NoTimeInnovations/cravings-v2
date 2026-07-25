"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { isValidLocalWhatsappNumber } from "@/lib/whatsappNumber";

/**
 * Collects the partner's WhatsApp number when a save needs it but it isn't set
 * (a valid number is required to book Porter deliveries). The same number is
 * used as the partner's mobile too. Shown instead of a blocking error so the
 * partner can add it and let the original save continue — nothing they already
 * typed is lost.
 */
export function ContactNumbersDialog({
  open,
  onOpenChange,
  countryCode,
  initialWhatsapp,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  countryCode: string;
  initialWhatsapp: string;
  saving: boolean;
  /** Called with the entered WhatsApp number once valid; caller persists it. */
  onSave: (whatsapp: string) => void;
}) {
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [error, setError] = useState<string | null>(null);

  // Re-seed whenever the dialog opens so it reflects the latest saved value.
  useEffect(() => {
    if (open) {
      setWhatsapp(initialWhatsapp);
      setError(null);
    }
  }, [open, initialWhatsapp]);

  const handleSave = () => {
    if (!isValidLocalWhatsappNumber(whatsapp, countryCode)) {
      setError("Enter a valid WhatsApp number — digits only, no country code or spaces.");
      return;
    }
    setError(null);
    onSave(whatsapp);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Override the primitive's mobile full-screen layout: keep it a small,
          centred popup on phones too (rounded card, not edge-to-edge). */}
      <DialogContent className="inset-auto left-1/2 top-1/2 h-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border">
        <DialogHeader>
          <DialogTitle>Add your WhatsApp number</DialogTitle>
          <DialogDescription>
            A valid WhatsApp number is required to book Porter deliveries — it&rsquo;s also used as
            your mobile number. Add it here to save your delivery settings — nothing you&rsquo;ve
            already entered will be lost.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="cnd-whatsapp">WhatsApp Number</Label>
            <Input
              id="cnd-whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="10-digit number"
              inputMode="tel"
              autoFocus
            />
          </div>
          {error && (
            <p className="flex items-start gap-1.5 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save & continue"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
