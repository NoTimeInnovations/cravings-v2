"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { ThemeConfig, DEFAULT_THEME } from "@/components/hotelDetail/ThemeChangeButton";
import { MENUSTYLES } from "@/components/hotelDetail/MenuStyleModal";
import { fontOptions } from "@/components/FontPickerModal";
import { Paintbrush, LayoutGrid, Type, Check } from "lucide-react";
import dynamic from "next/dynamic";
import { FontSelect } from "@/components/FontSelect";

const HexColorPicker = dynamic(
    () => import("react-colorful").then(mod => ({ default: mod.HexColorPicker })),
    { ssr: false }
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

    // Parse current theme
    const userTheme = (userData as any)?.theme;
    const currentTheme: ThemeConfig = userTheme
        ? JSON.parse(userTheme as string)
        : DEFAULT_THEME;

    const [menuStyle, setMenuStyle] = useState(currentTheme.menuStyle || "default");
    const [fontFamily, setFontFamily] = useState(currentTheme.fontFamily || "sans-serif");
    const [colors, setColors] = useState(currentTheme.colors || { text: "#000000", bg: "#F5F5F5", accent: "#EA580C" });
    const [activeColorPicker, setActiveColorPicker] = useState<"text" | "bg" | "accent" | null>(null);

    useEffect(() => {
        if (userTheme) {
            const parsed: ThemeConfig = JSON.parse(userTheme as string);
            setMenuStyle(parsed.menuStyle || "default");
            setFontFamily(parsed.fontFamily || "sans-serif");
            setColors(parsed.colors || { text: "#000000", bg: "#F5F5F5", accent: "#EA580C" });
        }
    }, [userTheme]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const newTheme: ThemeConfig = {
                colors,
                menuStyle,
                fontFamily,
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
        <div className="space-y-4">
            {/* Menu Style */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LayoutGrid className="h-5 w-5" />
                        Menu Layout
                    </CardTitle>
                    <CardDescription>Choose how your menu is displayed to customers.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                        {MENUSTYLES.map((style) => (
                            <button
                                key={style.id}
                                onClick={() => setMenuStyle(style.id)}
                                className={`relative rounded-xl border-2 p-4 text-center transition-all ${
                                    menuStyle === style.id
                                        ? "border-orange-500 bg-orange-50"
                                        : "border-gray-200 hover:border-gray-300"
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

            {/* Colors */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Paintbrush className="h-5 w-5" />
                        Colors
                    </CardTitle>
                    <CardDescription>Customize the color scheme of your menu.</CardDescription>
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
                                        colors.text === preset.text && colors.bg === preset.bg && colors.accent === preset.accent
                                            ? "border-orange-500"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="w-5 h-5 rounded-full" style={{ backgroundColor: preset.bg }} />
                                    <div className="w-5 h-5 rounded-full" style={{ backgroundColor: preset.accent }} />
                                    <div className="w-5 h-5 rounded-full" style={{ backgroundColor: preset.text }} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Individual color pickers */}
                    <div className="grid grid-cols-3 gap-4">
                        {(["text", "bg", "accent"] as const).map((key) => (
                            <div key={key}>
                                <p className="text-sm font-medium mb-1 capitalize">
                                    {key === "bg" ? "Background" : key === "text" ? "Text" : "Accent"}
                                </p>
                                <button
                                    onClick={() => setActiveColorPicker(activeColorPicker === key ? null : key)}
                                    className={`w-full h-10 rounded-lg border-2 transition-all ${
                                        activeColorPicker === key ? "border-orange-500" : "border-gray-200"
                                    }`}
                                    style={{ backgroundColor: colors[key] }}
                                />
                                {activeColorPicker === key && (
                                    <div className="mt-2">
                                        <HexColorPicker
                                            color={colors[key]}
                                            onChange={(val: string) => setColors({ ...colors, [key]: val })}
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
                                            className="mt-2 w-full text-sm border rounded-lg px-3 py-1.5"
                                            placeholder="#000000"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Font */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Type className="h-5 w-5" />
                        Font
                    </CardTitle>
                    <CardDescription>Choose the font family for your menu.</CardDescription>
                </CardHeader>
                <CardContent>
                    <FontSelect
                        options={fontOptions}
                        value={fontFamily}
                        onChange={setFontFamily}
                    />
                </CardContent>
            </Card>

            {/* Save Button */}
            <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
                {isSaving ? "Saving..." : "Save Theme"}
            </Button>
        </div>
    );
}
