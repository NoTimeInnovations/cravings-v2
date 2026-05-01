"use client";

import { HeroSection } from "@/types/storefront";
import { useStorefrontStore } from "@/store/storefrontStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ImageUpload } from "@/components/storefront/ImageUpload";

export function HeroSectionEditor({ section }: { section: HeroSection }) {
  const updateSection = useStorefrontStore((s) => s.updateSection);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Hero Banner</h2>
      <div className="space-y-2">
        <Label>Headline *</Label>
        <Input
          placeholder="Your Authentic Kerala Kitchen"
          value={section.headline}
          onChange={(e) => updateSection(section.id, { headline: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Subheadline</Label>
        <Input
          placeholder="Fresh food delivered to your door"
          value={section.subheadline}
          onChange={(e) => updateSection(section.id, { subheadline: e.target.value })}
        />
      </div>
      <ImageUpload
        label="Hero Image"
        value={section.hero_image_url}
        onChange={(url) => updateSection(section.id, { hero_image_url: url })}
        folder="storefront/hero"
      />
      <div className="space-y-2">
        <Label>CTA Button Text</Label>
        <Input
          value={section.cta_text}
          onChange={(e) => updateSection(section.id, { cta_text: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>CTA Link</Label>
        <Input
          placeholder="/your-menu"
          value={section.cta_link}
          onChange={(e) => updateSection(section.id, { cta_link: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to link to your menu
        </p>
      </div>
      <div className="space-y-2">
        <Label>Image Overlay Darkness — {section.overlay_opacity}%</Label>
        <Slider
          min={0}
          max={70}
          step={5}
          value={[section.overlay_opacity]}
          onValueChange={([v]) => updateSection(section.id, { overlay_opacity: v })}
        />
        <p className="text-xs text-muted-foreground">
          Higher = darker overlay, better text readability
        </p>
      </div>
    </div>
  );
}
