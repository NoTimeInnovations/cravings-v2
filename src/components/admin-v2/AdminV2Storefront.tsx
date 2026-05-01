"use client";

import { useEffect, useState } from "react";
import { useStorefrontStore } from "@/store/storefrontStore";
import { useAuthStore } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  getStorefrontConfigQuery,
  updateStorefrontConfigMutation,
} from "@/api/partners";
import {
  DEFAULT_STOREFRONT_CONFIG,
  StorefrontConfig,
  StorefrontSection,
} from "@/types/storefront";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layout,
  Loader2,
  ExternalLink,
  Save,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { SectionList } from "@/components/storefront/SectionList";
import {
  HeroSectionEditor,
  FeaturedItemsSectionEditor,
  ReviewsSectionEditor,
  AboutSectionEditor,
  CustomSectionEditor,
  ThemeEditor,
} from "@/components/storefront/editors";

function renderEditor(section: StorefrontSection) {
  switch (section.type) {
    case "hero":
      return <HeroSectionEditor section={section} />;
    case "featured_items":
      return <FeaturedItemsSectionEditor section={section} />;
    case "reviews":
      return <ReviewsSectionEditor section={section} />;
    case "about":
      return <AboutSectionEditor section={section} />;
    case "custom":
      return <CustomSectionEditor section={section} />;
  }
}

function EmptyEditorState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      <Layout className="h-10 w-10 mb-3 opacity-40" />
      <p>Select a section from the left to edit it</p>
    </div>
  );
}

export function AdminV2Storefront() {
  const { userData } = useAuthStore();
  const partnerId = userData?.id;
  const username = (userData as { username?: string } | null)?.username;

  const {
    config,
    isSaving,
    isDirty,
    activeSectionId,
    setConfig,
    setIsSaving,
    setEnabled,
    markClean,
  } = useStorefrontStore();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partnerId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchFromHasura(getStorefrontConfigQuery, {
          partner_id: partnerId,
        });
        const saved = res?.partners_by_pk
          ?.storefront_config as StorefrontConfig | null;
        setConfig(saved ?? DEFAULT_STOREFRONT_CONFIG);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load storefront config");
      } finally {
        setLoading(false);
      }
    })();
  }, [partnerId, setConfig]);

  const handleSave = async () => {
    if (!partnerId) return;
    setIsSaving(true);
    try {
      await fetchFromHasura(updateStorefrontConfigMutation, {
        partner_id: partnerId,
        storefront_config: config,
      });
      await fetch(`/api/revalidate-tag?tag=${partnerId}`).catch(() => {});
      markClean();
      toast.success("Storefront saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save storefront");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    if (!username) {
      toast.error("Set your username first in Settings");
      return;
    }
    window.open(`/${username}/home`, "_blank");
  };

  const activeSection =
    activeSectionId && activeSectionId !== "__theme__"
      ? config.sections.find((s) => s.id === activeSectionId)
      : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-96 w-80" />
          <Skeleton className="h-96 flex-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 bg-background rounded-lg border p-4 sticky top-0 z-10 flex-wrap">
        <div className="flex items-center gap-3">
          <Layout className="h-6 w-6 text-orange-600" />
          <h1 className="text-2xl font-bold">Storefront</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch
              checked={config.enabled}
              onCheckedChange={setEnabled}
              id="storefront-enabled"
            />
            <label htmlFor="storefront-enabled" className="text-sm font-medium">
              {config.enabled ? "Live" : "Draft"}
            </label>
          </div>
          <Button variant="outline" onClick={handlePreview} type="button">
            <ExternalLink className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            type="button"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      {isDirty && (
        <Alert className="border-yellow-300 bg-yellow-50 text-yellow-900 flex items-center">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full gap-4">
            <span>You have unsaved changes</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              type="button"
            >
              Save now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <Card className="w-full lg:w-80 p-3 lg:sticky lg:top-24">
          <SectionList />
        </Card>
        <Card className="flex-1 w-full p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {activeSectionId === "__theme__" ? (
            <ThemeEditor />
          ) : activeSection ? (
            renderEditor(activeSection)
          ) : (
            <EmptyEditorState />
          )}
        </Card>
      </div>
    </div>
  );
}
