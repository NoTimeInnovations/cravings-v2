"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bike, CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { updatePartner } from "@/api/partners";

const SUPPORT_WA_NUMBER = "917012944024";

const PRESET_SERVICES = [
  "Porter",
  "Rapido",
  "Uber",
  "Shadowfax",
] as const;

interface DeliveryReq {
  services: string[];
  notes?: string;
}

export function AdminV2DeliveryIntegration() {
  const { userData, setState } = useAuthStore();
  const partner = userData as any;

  const existing: DeliveryReq | null = partner?.delivery_partner_integration_req ?? null;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [otherText, setOtherText] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const services = existing?.services ?? [];
    const presetSet = new Set<string>(PRESET_SERVICES as readonly string[]);
    const presets = services.filter((s) => presetSet.has(s));
    const others = services.filter((s) => !presetSet.has(s));
    setSelected(new Set(presets));
    setOtherText(others.join(", "));
    setNotes(existing?.notes ?? "");
  }, [existing?.services?.join("|"), existing?.notes]);

  const toggle = (service: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(service)) next.delete(service);
      else next.add(service);
      return next;
    });
  };

  const combinedServices = useMemo(() => {
    const others = otherText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return [...Array.from(selected), ...others];
  }, [selected, otherText]);

  const buildWhatsappLink = (req: DeliveryReq) => {
    const serviceLine = req.services.length > 0 ? req.services.join(", ") : "(none specified)";
    const notesLine = req.notes ? `\nNotes: ${req.notes}` : "";
    const msg = `Hi, I'd like help integrating delivery services on Menuthere.\n\nRestaurant: ${partner?.store_name ?? ""}\nNearby services available: ${serviceLine}${notesLine}`;
    return `https://wa.me/${SUPPORT_WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner?.id) {
      toast.error("You must be signed in as a partner");
      return;
    }
    if (combinedServices.length === 0) {
      toast.error("Select at least one delivery service");
      return;
    }

    const req: DeliveryReq = {
      services: combinedServices,
      notes: notes.trim() || undefined,
    };

    setIsSaving(true);
    try {
      await updatePartner(partner.id, { delivery_partner_integration_req: req });
      setState({ delivery_partner_integration_req: req } as any);
      toast.success("Delivery integration request saved");
      window.open(buildWhatsappLink(req), "_blank");
    } catch (err) {
      console.error("Failed to save delivery integration req", err);
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Delivery Service Integration</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tell us which third-party delivery services are available near your restaurant. We&apos;ll reach out on WhatsApp to help you set them up.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bike className="h-5 w-5 text-orange-600" />
            Nearby delivery services
          </CardTitle>
        </CardHeader>
        <CardContent>
          {existing && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-green-800 dark:text-green-300">
                  Request already submitted
                </div>
                <div className="text-green-700 dark:text-green-400">
                  You can update your selections below and resubmit.
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <Label>Available services</Label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_SERVICES.map((service) => {
                  const isChecked = selected.has(service);
                  return (
                    <label
                      key={service}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                        isChecked
                          ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggle(service)}
                      />
                      <span className="text-sm">{service}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="other-services">Other services (comma-separated)</Label>
              <Input
                id="other-services"
                placeholder="e.g. Pidge, WeFast"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-notes">Notes (optional)</Label>
              <Textarea
                id="delivery-notes"
                placeholder="Anything else we should know — preferred provider, account status, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={isSaving}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Save & continue on WhatsApp
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
