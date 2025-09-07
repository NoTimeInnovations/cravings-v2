"use client";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Partner } from "@/store/authStore";
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { revalidateTag } from "@/app/actions/revalidate";
import { toast } from "sonner";
import { FeatureFlags, getFeatures, revertFeatureToString } from "@/lib/getFeatures";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Info, Menu, Search } from "lucide-react";

interface PartnerWithFeatureFlags extends Partner {
  featureFlag: FeatureFlags;
}

const FeatureFlagManagement = () => {
  const [partners, setPartners] = useState<PartnerWithFeatureFlags[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<PartnerWithFeatureFlags | null>(null);

  // Define all possible features with their descriptions
  const allFeatures = {
    ordering: "Enables ordering feature in QR Scan page.",
    delivery: "Enables ordering feature in Hotel Details page.",
    multiwhatsapp: "Enables multiple WhatsApp numbers for a partner.",
    pos: "Enables POS feature for a partner.",
    stockmanagement: "Enables stock management feature for a partner.",
    captainordering: "Enables captain account creation and management for partners. Partners can create and manage captain accounts for taking orders."
  };

  const getAllPartners = async () => {
    setLoading(true);
    try {
      const res = await fetchFromHasura(
        `query {
          partners {
            id
            store_name
            feature_flags
          }
        }`
      );

      if (res) {
        const partnersWithFeatureFlags = res.partners.map(
          (partner: Partner) => {
            // Get base feature flags
            const featureFlag = getFeatures(partner.feature_flags || "");
            
            // Ensure all features are present and properly initialized
            const defaultFeatures = {
              ordering: { access: false, enabled: false },
              delivery: { access: false, enabled: false },
              multiwhatsapp: { access: false, enabled: false },
              pos: { access: false, enabled: false },
              stockmanagement: { access: false, enabled: false },
              captainordering: { access: false, enabled: false }
            };

            // Merge existing flags with defaults
            const mergedFeatureFlag = {
              ...defaultFeatures,
              ...featureFlag,
              // Ensure captainordering is present
              captainordering: featureFlag.captainordering || { access: false, enabled: false }
            };
            
            console.log("Merged feature flags for", partner.store_name, ":", mergedFeatureFlag);
            
            return {
              ...partner,
              featureFlag: mergedFeatureFlag
            };
          }
        );
        setPartners(partnersWithFeatureFlags);
      }
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Failed to load partners");
    } finally {
      setLoading(false);
    }
  };

  const updateFeatureFlag = async (
    partnerId: string,
    feature: keyof FeatureFlags,
    type: "access" | "enabled",
    value: boolean
  ) => {
    try {
      setPartners(prev => prev.map(partner => {
        if (partner.id === partnerId) {
          const updatedFeatureFlag = {
            ...partner.featureFlag,
            [feature]: {
              ...partner.featureFlag[feature],
              [type]: value,
              ...(type === "enabled" && value ? { access: true } : {}),
              ...(type === "access" && !value ? { enabled: false } : {}),
            },
          };

          updatePartnerFeatureFlags(partnerId, updatedFeatureFlag);
          return {
            ...partner,
            featureFlag: updatedFeatureFlag,
          };
        }
        return partner;
      }));

      if (selectedPartner?.id === partnerId) {
        setSelectedPartner(prev => {
          if (!prev) return null;
          return {
            ...prev,
            featureFlag: {
              ...prev.featureFlag,
              [feature]: {
                ...prev.featureFlag[feature],
                [type]: value,
                ...(type === "enabled" && value ? { access: true } : {}),
                ...(type === "access" && !value ? { enabled: false } : {}),
              },
            },
          };
        });
      }
    } catch (error) {
      console.error("Error updating feature flag:", error);
      toast.error("Failed to update feature flag");
      getAllPartners();
    }
  };

  const updatePartnerFeatureFlags = async (
    partnerId: string,
    featureFlag: FeatureFlags
  ) => {
    try {
      const featureString = revertFeatureToString(featureFlag);
      await fetchFromHasura(
        `mutation UpdatePartnerFeatureFlags($partnerId: uuid!, $featureFlags: String!) {
          update_partners_by_pk(pk_columns: {id: $partnerId}, _set: {feature_flags: $featureFlags}) {
            id
            feature_flags
          }
        }`,
        { partnerId, featureFlags: featureString }
      );
      revalidateTag(partnerId);
      toast.success("Feature flags updated");
    } catch (error) {
      throw error;
    }
  };

  const filteredPartners = partners.filter(partner =>
    partner.store_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    getAllPartners();
  }, []);

  if (loading) {
    return (
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 w-32 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-4 bg-gray-100 rounded w-full"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search partners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPartners.map((partner) => {
          console.log("Rendering partner card for", partner.store_name, "with features:", partner.featureFlag);
          return (
            <Card key={partner.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>{partner.store_name}</CardTitle>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPartner(partner)}
                      >
                        <Menu className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full md:w-[500px] overflow-y-auto">
                      {selectedPartner && (
                        <>
                          <SheetHeader className="mb-6 sticky top-0 bg-background z-10 pb-4">
                            <SheetTitle>{selectedPartner.store_name}</SheetTitle>
                          </SheetHeader>
                          <div className="space-y-6 pr-4">
                            {Object.entries(selectedPartner.featureFlag).map(([feature, config]) => (
                              <div key={feature} className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium capitalize">
                                      {feature}
                                    </span>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-4 w-4">
                                          <Info className="h-3 w-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="capitalize">
                                            {feature} Feature
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            {allFeatures[feature as keyof typeof allFeatures]}
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogAction>Close</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                  <Badge variant={config.enabled ? "default" : "secondary"}>
                                    {config.enabled ? "Enabled" : "Disabled"}
                                  </Badge>
                                </div>
                                <div className="space-y-3 pl-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm">Access</span>
                                    <Checkbox
                                      checked={config.access}
                                      onCheckedChange={(checked) =>
                                        updateFeatureFlag(
                                          selectedPartner.id,
                                          feature as keyof FeatureFlags,
                                          "access",
                                          checked as boolean
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm">Enabled</span>
                                    <Checkbox
                                      checked={config.enabled}
                                      disabled={!config.access}
                                      onCheckedChange={(checked) =>
                                        updateFeatureFlag(
                                          selectedPartner.id,
                                          feature as keyof FeatureFlags,
                                          "enabled",
                                          checked as boolean
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </SheetContent>
                  </Sheet>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(partner.featureFlag).map(([feature, config]) => (
                    <Badge
                      key={feature}
                      variant={config.enabled ? "default" : "outline"}
                      className="capitalize"
                    >
                      {feature}: {config.enabled ? "ON" : "OFF"}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FeatureFlagManagement;