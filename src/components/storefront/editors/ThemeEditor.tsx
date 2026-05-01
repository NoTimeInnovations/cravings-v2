"use client";

import { useStorefrontStore } from "@/store/storefrontStore";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

export function ThemeEditor() {
  const { config, updateTheme, updateSeo } = useStorefrontStore();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Theme & Colors</h2>

      <div className="space-y-2">
        <Label>Brand Color</Label>
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-md border relative cursor-pointer"
            style={{ backgroundColor: config.theme.primary_color }}
          >
            <input
              type="color"
              value={config.theme.primary_color}
              onChange={(e) => updateTheme({ primary_color: e.target.value })}
              className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
              aria-label="Pick brand color"
            />
          </div>
          <Input
            value={config.theme.primary_color}
            onChange={(e) => updateTheme({ primary_color: e.target.value })}
            className="font-mono w-32"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Used for buttons, highlights, and accents across your storefront
        </p>
      </div>

      <div className="space-y-2">
        <Label>Font Style</Label>
        <RadioGroup
          value={config.theme.font_style}
          onValueChange={(v) =>
            updateTheme({ font_style: v as "modern" | "classic" | "minimal" })
          }
          className="space-y-2"
        >
          <label className="flex items-center gap-3 cursor-pointer border rounded-lg p-3 hover:bg-accent/30">
            <RadioGroupItem value="modern" />
            <div>
              <div className="font-medium">Modern</div>
              <div className="text-xs text-muted-foreground">clean, sans-serif</div>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer border rounded-lg p-3 hover:bg-accent/30">
            <RadioGroupItem value="classic" />
            <div>
              <div className="font-medium font-serif">Classic</div>
              <div className="text-xs text-muted-foreground">elegant, serif</div>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer border rounded-lg p-3 hover:bg-accent/30">
            <RadioGroupItem value="minimal" />
            <div>
              <div className="font-medium tracking-tight">Minimal</div>
              <div className="text-xs text-muted-foreground">
                ultra-clean, lots of whitespace
              </div>
            </div>
          </label>
        </RadioGroup>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="font-medium">SEO (optional)</h3>
        <div className="space-y-2">
          <Label>Page Title</Label>
          <Input
            placeholder="Malabar Spices | Order Online"
            value={config.seo?.meta_title ?? ""}
            onChange={(e) => updateSeo({ meta_title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Meta Description</Label>
          <Textarea
            placeholder="Order fresh Kerala food online..."
            rows={2}
            value={config.seo?.meta_description ?? ""}
            onChange={(e) => updateSeo({ meta_description: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
