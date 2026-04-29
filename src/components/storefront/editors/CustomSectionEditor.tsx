"use client";

import { CustomSection } from "@/types/storefront";
import { useStorefrontStore } from "@/store/storefrontStore";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/storefront/ImageUpload";

export function CustomSectionEditor({ section }: { section: CustomSection }) {
  const updateSection = useStorefrontStore((s) => s.updateSection);
  const hasButton = !!section.button;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Custom Section</h2>
      <div className="space-y-2">
        <Label>Title (optional)</Label>
        <Input
          value={section.title ?? ""}
          onChange={(e) => updateSection(section.id, { title: e.target.value })}
        />
      </div>
      <ImageUpload
        label="Image (optional)"
        value={section.image_url ?? ""}
        onChange={(url) => updateSection(section.id, { image_url: url })}
        folder="storefront/custom"
      />
      <div className="space-y-2">
        <Label>Content *</Label>
        <Textarea
          rows={6}
          value={section.content}
          onChange={(e) => updateSection(section.id, { content: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={hasButton}
          onCheckedChange={(val) => {
            updateSection(section.id, {
              button: val
                ? { text: "Learn More", link: "", new_tab: false }
                : undefined,
            });
          }}
        />
        <Label>Add a button</Label>
      </div>
      {hasButton && section.button && (
        <div className="pl-4 border-l-2 space-y-3">
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={section.button.text}
              onChange={(e) =>
                updateSection(section.id, {
                  button: { ...section.button!, text: e.target.value },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Button Link</Label>
            <Input
              placeholder="https://... or /username/menu"
              value={section.button.link}
              onChange={(e) =>
                updateSection(section.id, {
                  button: { ...section.button!, link: e.target.value },
                })
              }
            />
          </div>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={section.button.new_tab}
              onCheckedChange={(val) =>
                updateSection(section.id, {
                  button: { ...section.button!, new_tab: Boolean(val) },
                })
              }
            />
            <span className="text-sm">Open in new tab</span>
          </label>
        </div>
      )}
    </div>
  );
}
