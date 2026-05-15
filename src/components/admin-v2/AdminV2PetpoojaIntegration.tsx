"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, Store, Mail, User, MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { updatePartner } from "@/api/partners";

const SUPPORT_WA_NUMBER = "917012944024";

interface PetpoojaReq {
  petpooja_id: string;
  email: string;
  name: string;
}

export function AdminV2PetpoojaIntegration() {
  const { userData, setState } = useAuthStore();
  const partner = userData as any;

  const existing: PetpoojaReq | null = partner?.petpooja_integration_req ?? null;

  const [petpoojaId, setPetpoojaId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPetpoojaId(existing?.petpooja_id ?? "");
    setEmail(existing?.email ?? partner?.email ?? "");
    setName(existing?.name ?? partner?.store_name ?? "");
  }, [existing?.petpooja_id, existing?.email, existing?.name, partner?.email, partner?.store_name]);

  const buildWhatsappLink = (req: PetpoojaReq) => {
    const msg = `Hi, I'd like to start the Petpooja integration for my restaurant on Menuthere.\n\nRestaurant name: ${req.name}\nPetpooja Restaurant ID: ${req.petpooja_id}\nPetpooja email: ${req.email}`;
    return `https://wa.me/${SUPPORT_WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner?.id) {
      toast.error("You must be signed in as a partner");
      return;
    }
    if (!petpoojaId.trim() || !email.trim() || !name.trim()) {
      toast.error("Please fill all fields");
      return;
    }

    const req: PetpoojaReq = {
      petpooja_id: petpoojaId.trim(),
      email: email.trim(),
      name: name.trim(),
    };

    setIsSaving(true);
    try {
      await updatePartner(partner.id, { petpooja_integration_req: req });
      setState({ petpooja_integration_req: req } as any);
      toast.success("Petpooja integration request saved");
      window.open(buildWhatsappLink(req), "_blank");
    } catch (err) {
      console.error("Failed to save petpooja integration req", err);
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Petpooja Integration</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Submit your Petpooja details below. Once saved, we&apos;ll connect with you on WhatsApp to complete the setup.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="h-5 w-5 text-orange-600" />
            Integration details
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
                  You can update the details below and resubmit.
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pp-name">Restaurant name</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pp-name"
                  placeholder="e.g. Spice Garden"
                  className="pl-9"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pp-id">Petpooja Restaurant ID</Label>
              <div className="relative">
                <Store className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pp-id"
                  placeholder="e.g. 9876543"
                  className="pl-9"
                  value={petpoojaId}
                  onChange={(e) => setPetpoojaId(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pp-email">Petpooja email ID</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pp-email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
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
