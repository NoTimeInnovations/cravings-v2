"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import {
  ThemeConfig,
  DEFAULT_THEME,
} from "@/components/hotelDetail/ThemeChangeButton";
import { MENUSTYLES } from "@/components/hotelDetail/MenuStyleModal";
import { Paintbrush, LayoutGrid, Check, Grid3X3, Crown, ShoppingCart } from "lucide-react";
import dynamic from "next/dynamic";
import { MobilePreview } from "./MobilePreview";
import { isFreePlan } from "@/lib/getPlanLimits";
import { UpgradePlanDialog } from "../UpgradePlanDialog";

const HexColorPicker = dynamic(
  () =>
    import("react-colorful").then((mod) => ({ default: mod.HexColorPicker })),
  { ssr: false },
);

const COLOR_PRESETS = [
  { text: "#000000", bg: "#FEF6EB", accent: "#E9701B" },
  { text: "#0D1321", bg: "#F0EBD8", accent: "#3E5C76" },
  { text: "#172121", bg: "#E5D0CC", accent: "#444554" },
  { text: "#000000", bg: "#FFEBE7", accent: "#7F95D1" },
];

export function ThemeSettings() {
  const { userData } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const planId = (userData as any)?.subscription_details?.plan?.id;
  const onFreePlan = isFreePlan(planId);

  // Safely parse theme — old users may have a plain object instead of a JSON string
  const safeParseTheme = (raw: unknown): ThemeConfig => {
    if (!raw) return DEFAULT_THEME;
    if (typeof raw === "object")
      return {
        ...DEFAULT_THEME,
        ...(raw as Record<string, unknown>),
      } as ThemeConfig;
    try {
      return { ...DEFAULT_THEME, ...JSON.parse(raw as string) };
    } catch {
      return DEFAULT_THEME;
    }
  };

  const userTheme = (userData as any)?.theme;
  const currentTheme: ThemeConfig = safeParseTheme(userTheme);

  const [menuStyle, setMenuStyle] = useState(
    currentTheme.menuStyle || "default",
  );
  const [fontFamily, setFontFamily] = useState(
    currentTheme.fontFamily || "sans-serif",
  );
  const [colors, setColors] = useState(
    currentTheme.colors || {
      text: "#000000",
      bg: "#F5F5F5",
      accent: "#EA580C",
    },
  );
  const [showGrid, setShowGrid] = useState(currentTheme.showGrid ?? false);
  const [checkoutStyle, setCheckoutStyle] = useState<"default" | "v2">(
    currentTheme.checkoutStyle || "default",
  );
  const [activeColorPicker, setActiveColorPicker] = useState<
    "text" | "bg" | "accent" | null
  >(null);

  useEffect(() => {
    if (userTheme) {
      const parsed: ThemeConfig = safeParseTheme(userTheme);
      setMenuStyle(parsed.menuStyle || "default");
      setFontFamily(parsed.fontFamily || "sans-serif");
      setColors(
        parsed.colors || { text: "#000000", bg: "#F5F5F5", accent: "#EA580C" },
      );
      setShowGrid(parsed.showGrid ?? false);
      setCheckoutStyle(parsed.checkoutStyle || "default");
    }
  }, [userTheme]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newTheme: ThemeConfig = {
        colors,
        menuStyle,
        fontFamily,
        showGrid,
        checkoutStyle,
        infoAlignment: currentTheme.infoAlignment,
      };
      toast.loading("Saving theme...");
      await updatePartner(userData!.id, { theme: JSON.stringify(newTheme) });
      toast.dismiss();
      toast.success("Theme saved successfully");
      revalidateTag(userData!.id);
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to save theme");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Mobile preview - shown above settings on small screens */}
      <div className="lg:hidden flex justify-center">
        <MobilePreview
          menuStyle={menuStyle}
          colors={colors}
          fontFamily={fontFamily}
          showGrid={showGrid}
        />
      </div>

      {/* Left column: settings controls */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Menu Style */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Menu Layout
            </CardTitle>
            <CardDescription>
              Choose how your menu is displayed to customers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {MENUSTYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setMenuStyle(style.id)}
                  className={`relative rounded-xl border-2 p-4 text-center transition-all ${
                    menuStyle === style.id
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {menuStyle === style.id && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full p-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <div className="text-sm font-semibold">{style.name}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Colors - hidden for V3 theme */}
        {menuStyle !== "v3" && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paintbrush className="h-5 w-5" />
              Colors
            </CardTitle>
            <CardDescription>
              Customize the color scheme of your menu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Presets */}
            <div>
              <p className="text-sm font-medium mb-2">Presets</p>
              <div className="flex gap-3">
                {COLOR_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => setColors(preset)}
                    className={`rounded-xl border-2 p-2 flex gap-1 transition-all ${
                      colors.text === preset.text &&
                      colors.bg === preset.bg &&
                      colors.accent === preset.accent
                        ? "border-orange-500"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-600"
                      style={{ backgroundColor: preset.bg }}
                    />
                    <div
                      className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-600"
                      style={{ backgroundColor: preset.accent }}
                    />
                    <div
                      className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-600"
                      style={{ backgroundColor: preset.text }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Individual color pickers */}
            <div className="grid grid-cols-3 gap-4">
              {(["text", "bg", "accent"] as const).map((key) => (
                <div key={key}>
                  <p className="text-sm font-medium mb-1 capitalize">
                    {key === "bg"
                      ? "Background"
                      : key === "text"
                        ? "Text"
                        : "Accent"}
                  </p>
                  <button
                    onClick={() =>
                      setActiveColorPicker(
                        activeColorPicker === key ? null : key,
                      )
                    }
                    className={`w-full h-10 rounded-lg border-2 transition-all ${
                      activeColorPicker === key
                        ? "border-orange-500"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                    style={{ backgroundColor: colors[key] }}
                  />
                  {activeColorPicker === key && (
                    <div className="mt-2">
                      <HexColorPicker
                        color={colors[key]}
                        onChange={(val: string) =>
                          setColors({ ...colors, [key]: val })
                        }
                      />
                      <input
                        type="text"
                        value={colors[key]}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.length <= 7) {
                            setColors({ ...colors, [key]: val });
                          }
                        }}
                        className="mt-2 w-full text-sm border rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700"
                        placeholder="#000000"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>}

        {/* Grid Background - only for sidebar layout */}
        {menuStyle === "sidebar" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5" />
                Grid Background
              </CardTitle>
              <CardDescription>
                Toggle the subtle grid pattern on the menu background.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  {[
                    { label: "With Grid", value: true },
                    { label: "Without Grid", value: false },
                  ].map((option) => (
                    <button
                      key={String(option.value)}
                      onClick={() => setShowGrid(option.value)}
                      className={`relative rounded-xl border-2 px-5 py-3 text-center transition-all ${
                        showGrid === option.value
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      {showGrid === option.value && (
                        <div className="absolute top-1.5 right-1.5 bg-orange-500 text-white rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <div className="text-sm font-semibold">
                        {option.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Checkout Style */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Checkout Style
            </CardTitle>
            <CardDescription>
              Choose the checkout experience your customers see when placing an order.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "default" as const, name: "Classic" },
                { id: "v2" as const, name: "New (V2)" },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setCheckoutStyle(option.id)}
                  className={`relative rounded-xl border-2 p-4 text-center transition-all ${
                    checkoutStyle === option.id
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {checkoutStyle === option.id && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full p-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <div className="text-sm font-semibold">{option.name}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        {onFreePlan ? (
          <Button
            onClick={() => setShowUpgradeDialog(true)}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Save Theme
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSaving ? "Saving..." : "Save Theme"}
          </Button>
        )}

        <UpgradePlanDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          featureName="Theme Customization"
        />
      </div>

      {/* Right column: mobile preview */}
      <div className="hidden lg:block w-[320px] flex-shrink-0">
        <div className="sticky top-6">
          <MobilePreview
            menuStyle={menuStyle}
            colors={colors}
            fontFamily={fontFamily}
            showGrid={showGrid}
          />
        </div>
      </div>
    </div>
  );
}
