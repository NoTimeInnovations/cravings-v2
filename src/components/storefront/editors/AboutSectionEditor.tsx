"use client";

import { AboutSection } from "@/types/storefront";
import { useStorefrontStore } from "@/store/storefrontStore";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/storefront/ImageUpload";

export function AboutSectionEditor({ section }: { section: AboutSection }) {
  const updateSection = useStorefrontStore((s) => s.updateSection);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Our Story</h2>
      <div className="space-y-2">
        <Label>Section Title</Label>
        <Input
          value={section.title}
          onChange={(e) => updateSection(section.id, { title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Content</Label>
        <Textarea
          placeholder="Tell your restaurant's story..."
          rows={6}
          value={section.content}
          onChange={(e) => updateSection(section.id, { content: e.target.value })}
        />
      </div>
      <ImageUpload
        label="Image (optional)"
        value={section.image_url ?? ""}
        onChange={(url) => updateSection(section.id, { image_url: url })}
        folder="storefront/about"
      />
    </div>
  );
}
