"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Trash2,
  ExternalLink,
  Globe,
  GripVertical,
  Save,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getMenu } from "@/api/menu";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { ImageUpload } from "@/components/storefront/ImageUpload";
import {
  WebsiteConfig,
  DEFAULT_WEBSITE_CONFIG,
  mergeWebsiteConfig,
} from "@/types/website";
import { toast } from "sonner";

function parseJson(raw: any): any {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return typeof raw === "object" ? raw : null;
}

interface MenuItemRow {
  id: string;
  name: string;
  category?: { id: string; name: string };
}

function WebsiteFloatingSave() {
  const { saveAction, isSaving, hasChanges } = useAdminSettingsStore();
  if (!saveAction || !hasChanges) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <Button
        onClick={saveAction}
        disabled={isSaving}
        className="bg-orange-600 hover:bg-orange-700 text-white shadow-xl rounded-full h-12 px-6"
      >
        {isSaving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        <span className="font-semibold">Save Changes</span>
      </Button>
    </div>
  );
}

export function AdminV2Website() {
  const { userData, setState } = useAuthStore();
  const { setSaveAction, setHasChanges, setIsSaving } = useAdminSettingsStore();
  const partnerId = (userData as any)?.id;
  const username = (userData as any)?.username;

  const [config, setConfig] = useState<WebsiteConfig>(DEFAULT_WEBSITE_CONFIG);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    if (!userData) return;
    const direct = parseJson((userData as any)?.website_config);
    if (direct) {
      setConfig(mergeWebsiteConfig(direct));
    } else {
      // Backward compat with previously nested storefront_settings.website
      const settings = parseJson((userData as any)?.storefront_settings) || {};
      setConfig(mergeWebsiteConfig(settings.website || null));
    }
    setInitialLoaded(true);
  }, [userData]);

  useEffect(() => {
    if (!partnerId) return;
    fetchFromHasura(getMenu, { partner_id: partnerId })
      .then((res) => setMenuItems(res?.menu ?? []))
      .catch(() => {});
  }, [partnerId]);

  const updateField = useCallback(
    <K extends keyof WebsiteConfig>(section: K, value: Partial<WebsiteConfig[K]>) => {
      setConfig((prev) => ({
        ...prev,
        [section]: { ...(prev[section] as any), ...value },
      }));
      setHasChanges(true);
    },
    [setHasChanges],
  );

  const setEnabled = (v: boolean) => {
    setConfig((prev) => ({ ...prev, enabled: v }));
    setHasChanges(true);
  };

  const handleSave = useCallback(async () => {
    if (!userData) return;
    setIsSaving(true);
    try {
      await updatePartner((userData as any).id, {
        website_config: config,
      });
      revalidateTag((userData as any).id);
      setState({ website_config: config } as any);
      toast.success("Website settings saved");
      setHasChanges(false);
    } catch (e) {
      console.error("Save website error", e);
      toast.error("Failed to save website settings");
    } finally {
      setIsSaving(false);
    }
  }, [config, userData, setState, setHasChanges, setIsSaving]);

  useEffect(() => {
    if (!initialLoaded) return;
    setSaveAction(handleSave);
    return () => setSaveAction(null);
  }, [initialLoaded, handleSave, setSaveAction]);

  const handlePreview = () => {
    if (!username) {
      toast.error("Set your username in Settings first");
      return;
    }
    window.open(`/${username}/home`, "_blank");
  };

  // Build category list from menu
  const categories = useMemo(() => {
    const map: Record<string, { id: string; name: string; items: MenuItemRow[] }> = {};
    menuItems.forEach((m) => {
      const c = m.category;
      if (!c?.id) return;
      if (!map[c.id]) map[c.id] = { id: c.id, name: c.name, items: [] };
      map[c.id].items.push(m);
    });
    return Object.values(map);
  }, [menuItems]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 w-full lg:max-w-[80%] mx-auto px-2 sm:px-4 lg:px-0">
      <div className="flex items-center justify-between gap-5 flex-wrap">
        <div className="flex items-center gap-3">
          <Globe className="h-7 w-7 text-orange-600" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Website</h1>
            <p className="text-muted-foreground">Customize your public landing page.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch
              checked={config.enabled}
              onCheckedChange={setEnabled}
              id="website-enabled"
            />
            <Label htmlFor="website-enabled" className="text-sm font-medium">
              {config.enabled ? "Live" : "Draft"}
            </Label>
          </div>
          <Button variant="outline" onClick={handlePreview} type="button">
            <ExternalLink className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hero" className="space-y-4">
        <TabsList className="flex w-full sm:w-auto overflow-x-auto justify-start">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="marquee">Marquee</TabsTrigger>
          <TabsTrigger value="story">Our Story</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="visit">Visit</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
        </TabsList>

        <TabsContent value="hero">
          <HeroEditor
            value={config.hero}
            onChange={(v) => updateField("hero", v)}
          />
        </TabsContent>

        <TabsContent value="marquee">
          <MarqueeEditor
            value={config.marquee}
            onChange={(v) => updateField("marquee", v)}
          />
        </TabsContent>

        <TabsContent value="story">
          <StoryEditor
            value={config.story}
            onChange={(v) => updateField("story", v)}
          />
        </TabsContent>

        <TabsContent value="menu">
          <MenuEditor
            value={config.menu}
            categories={categories}
            onChange={(v) => updateField("menu", v)}
          />
        </TabsContent>

        <TabsContent value="visit">
          <VisitEditor
            value={config.visit}
            onChange={(v) => updateField("visit", v)}
          />
        </TabsContent>

        <TabsContent value="footer">
          <FooterEditor
            value={config.footer}
            onChange={(v) => updateField("footer", v)}
          />
        </TabsContent>

        <TabsContent value="theme">
          <ThemeEditor
            value={config.theme}
            onChange={(v) => updateField("theme", v)}
          />
        </TabsContent>
      </Tabs>

      <WebsiteFloatingSave />
    </div>
  );
}

function SectionToggle({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-2">
      <Label className="text-sm">{label}</Label>
      <Switch checked={enabled} onCheckedChange={onChange} />
    </div>
  );
}

function HeroEditor({
  value,
  onChange,
}: {
  value: WebsiteConfig["hero"];
  onChange: (v: Partial<WebsiteConfig["hero"]>) => void;
}) {
  const setImage = (i: number, url: string) => {
    const next = [...value.collage_images];
    next[i] = url;
    onChange({ collage_images: next });
  };
  const setLabel = (i: number, label: string) => {
    const next = [...value.collage_labels];
    next[i] = label;
    onChange({ collage_labels: next });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero section</CardTitle>
        <CardDescription>The big headline at the top of the page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SectionToggle
          enabled={value.enabled}
          onChange={(v) => onChange({ enabled: v })}
          label="Show hero section"
        />
        <div>
          <Label>Eyebrow</Label>
          <Input
            value={value.eyebrow}
            onChange={(e) => onChange({ eyebrow: e.target.value })}
            placeholder="Small label above headline"
          />
        </div>
        <div>
          <Label>Headline</Label>
          <Input
            value={value.headline}
            onChange={(e) => onChange({ headline: e.target.value })}
            placeholder="Main headline"
          />
        </div>
        <div>
          <Label>Headline accent (italic, brand color)</Label>
          <Input
            value={value.headline_accent}
            onChange={(e) => onChange({ headline_accent: e.target.value })}
            placeholder="Optional second line, italic accent"
          />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            value={value.subheadline}
            onChange={(e) => onChange({ subheadline: e.target.value })}
            rows={3}
            placeholder="Short description below headline"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>CTA text</Label>
            <Input
              value={value.cta_text}
              onChange={(e) => onChange({ cta_text: e.target.value })}
              placeholder="Order online"
            />
          </div>
          <div>
            <Label>CTA link (optional)</Label>
            <Input
              value={value.cta_link}
              onChange={(e) => onChange({ cta_link: e.target.value })}
              placeholder="Defaults to your menu page"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Hours label</Label>
            <Input
              value={value.hours_label}
              onChange={(e) => onChange({ hours_label: e.target.value })}
            />
          </div>
          <div>
            <Label>Hours value</Label>
            <Input
              value={value.hours_value}
              onChange={(e) => onChange({ hours_value: e.target.value })}
              placeholder="e.g., Mon – Sat · 10am – 10pm"
            />
          </div>
          <div>
            <Label>Address label</Label>
            <Input
              value={value.address_label}
              onChange={(e) => onChange({ address_label: e.target.value })}
            />
          </div>
          <div>
            <Label>Address value</Label>
            <Input
              value={value.address_value}
              onChange={(e) => onChange({ address_value: e.target.value })}
              placeholder="Short address line"
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Hero collage (4 images)</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 p-3 border rounded-md">
                <div className="text-xs text-muted-foreground">Image {i + 1}</div>
                <ImageUpload
                  value={value.collage_images[i] || ""}
                  onChange={(url) => setImage(i, url)}
                  folder="website-hero"
                />
                <Input
                  placeholder="Caption (optional)"
                  value={value.collage_labels[i] || ""}
                  onChange={(e) => setLabel(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MarqueeEditor({
  value,
  onChange,
}: {
  value: WebsiteConfig["marquee"];
  onChange: (v: Partial<WebsiteConfig["marquee"]>) => void;
}) {
  const update = (i: number, patch: Partial<{ text: string; accent: boolean }>) => {
    const next = [...value.tags];
    next[i] = { ...next[i], ...patch };
    onChange({ tags: next });
  };
  const add = () => {
    onChange({ tags: [...value.tags, { text: "", accent: false }] });
  };
  const remove = (i: number) => {
    onChange({ tags: value.tags.filter((_, idx) => idx !== i) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scrolling tags</CardTitle>
        <CardDescription>
          The marquee that scrolls below the hero. Toggle accent to italicize in your brand color.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <SectionToggle
          enabled={value.enabled}
          onChange={(v) => onChange({ enabled: v })}
          label="Show scrolling marquee"
        />
        {value.tags.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <Input
              value={t.text}
              onChange={(e) => update(i, { text: e.target.value })}
              placeholder="Tag text"
              className="flex-1"
            />
            <label className="flex items-center gap-1 text-xs">
              <Checkbox
                checked={t.accent}
                onCheckedChange={(v) => update(i, { accent: !!v })}
              />
              Accent
            </label>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => remove(i)}
              type="button"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button onClick={add} type="button" variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add tag
        </Button>
      </CardContent>
    </Card>
  );
}

function StoryEditor({
  value,
  onChange,
}: {
  value: WebsiteConfig["story"];
  onChange: (v: Partial<WebsiteConfig["story"]>) => void;
}) {
  const updateParagraph = (i: number, text: string) => {
    const next = [...value.paragraphs];
    next[i] = text;
    onChange({ paragraphs: next });
  };
  const addParagraph = () =>
    onChange({ paragraphs: [...value.paragraphs, ""] });
  const removeParagraph = (i: number) =>
    onChange({ paragraphs: value.paragraphs.filter((_, idx) => idx !== i) });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Our Story</CardTitle>
        <CardDescription>Tell visitors about your business.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SectionToggle
          enabled={value.enabled}
          onChange={(v) => onChange({ enabled: v })}
          label="Show story section"
        />
        <div>
          <Label>Eyebrow</Label>
          <Input
            value={value.eyebrow}
            onChange={(e) => onChange({ eyebrow: e.target.value })}
          />
        </div>
        <div>
          <Label>Title</Label>
          <Input
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Section title"
          />
        </div>
        <div>
          <Label>Title accent (italic, brand color)</Label>
          <Input
            value={value.title_accent}
            onChange={(e) => onChange({ title_accent: e.target.value })}
            placeholder="Optional second line"
          />
        </div>

        <div>
          <Label>Image</Label>
          <ImageUpload
            value={value.image_url}
            onChange={(url) => onChange({ image_url: url })}
            folder="website-story"
          />
          <Input
            value={value.image_label}
            onChange={(e) => onChange({ image_label: e.target.value })}
            placeholder="Image alt / caption"
            className="mt-2"
          />
        </div>

        <div className="space-y-2">
          <Label>Paragraphs</Label>
          <p className="text-xs text-muted-foreground">
            The first paragraph is shown larger as a lead.
          </p>
          {value.paragraphs.map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <Textarea
                value={p}
                onChange={(e) => updateParagraph(i, e.target.value)}
                rows={3}
                placeholder={i === 0 ? "Lead paragraph (larger)" : "Paragraph"}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeParagraph(i)}
                type="button"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button onClick={addParagraph} type="button" variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add paragraph
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MenuEditor({
  value,
  categories,
  onChange,
}: {
  value: WebsiteConfig["menu"];
  categories: { id: string; name: string; items: MenuItemRow[] }[];
  onChange: (v: Partial<WebsiteConfig["menu"]>) => void;
}) {
  const toggleCategory = (cid: string) => {
    const has = value.category_ids.includes(cid);
    onChange({
      category_ids: has
        ? value.category_ids.filter((x) => x !== cid)
        : [...value.category_ids, cid],
    });
  };
  const toggleItem = (cid: string, itemId: string) => {
    const current = value.item_ids_by_category[cid] || [];
    const has = current.includes(itemId);
    onChange({
      item_ids_by_category: {
        ...value.item_ids_by_category,
        [cid]: has ? current.filter((x) => x !== itemId) : [...current, itemId],
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu section</CardTitle>
        <CardDescription>
          Pick the categories and items to feature.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SectionToggle
          enabled={value.enabled}
          onChange={(v) => onChange({ enabled: v })}
          label="Show menu section"
        />
        <div>
          <Label>Eyebrow</Label>
          <Input
            value={value.eyebrow}
            onChange={(e) => onChange({ eyebrow: e.target.value })}
          />
        </div>
        <div>
          <Label>Title</Label>
          <Input
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>
        <div>
          <Label>Title accent (italic, brand color)</Label>
          <Input
            value={value.title_accent}
            onChange={(e) => onChange({ title_accent: e.target.value })}
          />
        </div>
        <div>
          <Label>Footer note</Label>
          <Textarea
            value={value.note}
            onChange={(e) => onChange({ note: e.target.value })}
            rows={2}
            placeholder="Small note below the menu (optional)"
          />
        </div>
        <div>
          <Label>CTA button text</Label>
          <Input
            value={value.cta_text}
            onChange={(e) => onChange({ cta_text: e.target.value })}
          />
        </div>

        <div>
          <Label className="mb-2 block">Categories &amp; items</Label>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No menu items found. Add menu items first.
            </p>
          ) : (
            <div className="space-y-3">
              {categories.map((c) => {
                const enabled = value.category_ids.includes(c.id);
                const selectedItems = value.item_ids_by_category[c.id] || [];
                return (
                  <div key={c.id} className="border rounded-md p-3">
                    <label className="flex items-center gap-2 font-medium">
                      <Checkbox
                        checked={enabled}
                        onCheckedChange={() => toggleCategory(c.id)}
                      />
                      {c.name}
                      <span className="text-xs text-muted-foreground">
                        ({c.items.length} items)
                      </span>
                    </label>
                    {enabled && (
                      <div className="mt-2 ml-6 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {c.items.map((it) => (
                          <label
                            key={it.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={selectedItems.includes(it.id)}
                              onCheckedChange={() => toggleItem(c.id, it.id)}
                            />
                            {it.name}
                          </label>
                        ))}
                        <p className="col-span-full text-xs text-muted-foreground">
                          Leave all unchecked to show the first 8 automatically.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VisitEditor({
  value,
  onChange,
}: {
  value: WebsiteConfig["visit"];
  onChange: (v: Partial<WebsiteConfig["visit"]>) => void;
}) {
  const updateHour = (i: number, patch: Partial<{ label: string; value: string }>) => {
    const next = [...value.hours];
    next[i] = { ...next[i], ...patch };
    onChange({ hours: next });
  };
  const addHour = () =>
    onChange({ hours: [...value.hours, { label: "", value: "" }] });
  const removeHour = (i: number) =>
    onChange({ hours: value.hours.filter((_, idx) => idx !== i) });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visit section</CardTitle>
        <CardDescription>Address, hours, transit, contact, and a map image.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SectionToggle
          enabled={value.enabled}
          onChange={(v) => onChange({ enabled: v })}
          label="Show visit section"
        />
        <div>
          <Label>Eyebrow</Label>
          <Input
            value={value.eyebrow}
            onChange={(e) => onChange({ eyebrow: e.target.value })}
          />
        </div>
        <div>
          <Label>Title</Label>
          <Input
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>
        <div>
          <Label>Title accent (italic)</Label>
          <Input
            value={value.title_accent}
            onChange={(e) => onChange({ title_accent: e.target.value })}
          />
        </div>

        <div>
          <Label>Address (multi-line)</Label>
          <Textarea
            value={value.address_lines}
            onChange={(e) => onChange({ address_lines: e.target.value })}
            rows={3}
            placeholder="Street&#10;City, postal"
          />
        </div>
        <div>
          <Label>Address note</Label>
          <Input
            value={value.address_note}
            onChange={(e) => onChange({ address_note: e.target.value })}
            placeholder="e.g., between the two banks"
          />
        </div>

        <div className="space-y-2">
          <Label>Hours</Label>
          {value.hours.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="Days (e.g., Mon – Fri)"
                value={h.label}
                onChange={(e) => updateHour(i, { label: e.target.value })}
                className="flex-1"
              />
              <Input
                placeholder="Time (e.g., 10am – 10pm)"
                value={h.value}
                onChange={(e) => updateHour(i, { value: e.target.value })}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeHour(i)}
                type="button"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button onClick={addHour} type="button" variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add hours row
          </Button>
        </div>

        <div>
          <Label>Getting here</Label>
          <Textarea
            value={value.getting_here}
            onChange={(e) => onChange({ getting_here: e.target.value })}
            rows={2}
            placeholder="Transit / parking notes"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Contact phone</Label>
            <Input
              value={value.contact_phone}
              onChange={(e) => onChange({ contact_phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Contact email</Label>
            <Input
              value={value.contact_email}
              onChange={(e) => onChange({ contact_email: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FooterEditor({
  value,
  onChange,
}: {
  value: WebsiteConfig["footer"];
  onChange: (v: Partial<WebsiteConfig["footer"]>) => void;
}) {
  const update = (i: number, patch: Partial<{ label: string; url: string }>) => {
    const next = [...value.policies];
    next[i] = { ...next[i], ...patch };
    onChange({ policies: next });
  };
  const add = () =>
    onChange({ policies: [...value.policies, { label: "", url: "" }] });
  const remove = (i: number) =>
    onChange({ policies: value.policies.filter((_, idx) => idx !== i) });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Footer</CardTitle>
        <CardDescription>
          Social links pull automatically from your account. Add policy links and
          a custom copyright if you like.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SectionToggle
          enabled={value.enabled}
          onChange={(v) => onChange({ enabled: v })}
          label="Show footer"
        />
        <div>
          <Label>Copyright text (optional)</Label>
          <Input
            value={value.copyright}
            onChange={(e) => onChange({ copyright: e.target.value })}
            placeholder="Defaults to © {Store name} {year}"
          />
        </div>

        <div className="space-y-2">
          <Label>Policy links</Label>
          {value.policies.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="Label (e.g., Privacy)"
                value={p.label}
                onChange={(e) => update(i, { label: e.target.value })}
                className="flex-1"
              />
              <Input
                placeholder="URL"
                value={p.url}
                onChange={(e) => update(i, { url: e.target.value })}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
                type="button"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button onClick={add} type="button" variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add policy link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ThemeEditor({
  value,
  onChange,
}: {
  value: WebsiteConfig["theme"];
  onChange: (v: Partial<WebsiteConfig["theme"]>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>
          The accent color comes from your Theme settings — this controls just the
          page background and text.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Background color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value.bg_color}
                onChange={(e) => onChange({ bg_color: e.target.value })}
                className="h-10 w-12 rounded border"
              />
              <Input
                value={value.bg_color}
                onChange={(e) => onChange({ bg_color: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Text color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value.ink_color}
                onChange={(e) => onChange({ ink_color: e.target.value })}
                className="h-10 w-12 rounded border"
              />
              <Input
                value={value.ink_color}
                onChange={(e) => onChange({ ink_color: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Try a dark background like <code>#0E0F0C</code> with light text{" "}
          <code>#F4EFE6</code>, or invert for a light theme.
        </div>
      </CardContent>
    </Card>
  );
}
