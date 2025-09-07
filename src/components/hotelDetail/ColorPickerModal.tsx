import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ThemeConfig } from "./ThemeChangeButton";
import { History } from "lucide-react";
import dynamic from "next/dynamic";

interface ColorPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (colors: { text: string; bg: string; accent: string }) => void;
  theme: ThemeConfig | null;
}

const DEFAULT_COLORS = {
  text: "#000000",
  bg: "#F5F5F5",
  accent: "#EA580C",
};

const PRESETS = [
  {
    text: "#000000",
    bg: "#FEF6EB",
    accent: "#E9701B",
  },
  {
    text: "#0D1321",
    bg: "#F0EBD8",
    accent: "#3E5C76",
  },
  {
    text: "#172121",
    bg: "#E5D0CC",
    accent: "#444554",
  },
  {
    text: "#000000",
    bg: "#FFEBE7",
    accent: "#7F95D1",
  }
];

const HexColorPicker = dynamic(
  () => import("react-colorful").then(mod => ({ default: mod.HexColorPicker })),
  { ssr: false }
);

const ColorPickerModal = ({
  theme,
  open,
  onOpenChange,
  onSave,
}: ColorPickerModalProps) => {
  const [colors, setColors] = React.useState({
    text: theme?.colors?.text || DEFAULT_COLORS.text,
    bg: theme?.colors?.bg || DEFAULT_COLORS.bg,
    accent: theme?.colors?.accent || DEFAULT_COLORS.accent,
  });
  const [currentPicker, setCurrentPicker] =
    React.useState<keyof typeof colors>("text");
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  const handleReset = () => {
    setColors(DEFAULT_COLORS);
  };

  useEffect(() => {
    setColors({
      text: theme?.colors?.text || DEFAULT_COLORS.text,
      bg: theme?.colors?.bg || DEFAULT_COLORS.bg,
      accent: theme?.colors?.accent || DEFAULT_COLORS.accent,
    });
  }, [open]);

  const handleColorButtonClick = (colorKey: keyof typeof colors) => {
    setCurrentPicker(colorKey);
    setShowColorPicker(true);
  };

  return (
    <>
      {/* Main customization dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90%] max-w-[425px] rounded-xl h-fit top-[50%] translate-y-[-50%]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div></div>
            <DialogTitle>Color Customization</DialogTitle>
            <div className="rounded-full w-fit h-fit" onClick={handleReset}>
              <History className="h-5 w-5" />
            </div>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between h-[200px] gap-2">
              {Object.entries(colors).map(([key, value]) => (
                <div className="flex flex-col items-center gap-2" key={key}>
                  <Button
                    variant={currentPicker === key ? "default" : "outline"}
                    onClick={() => handleColorButtonClick(key as keyof typeof colors)}
                    style={{ backgroundColor: value }}
                    className={`transition-transform duration-200 rounded-full h-[100px] w-[100px] ${
                      currentPicker === key ? "scale-110" : "scale-100"
                    }`}
                  ></Button>
                  <div className="text-black capitalize font-medium"> {key}</div>
                </div>
              ))}
            </div>

            <div className="py-2">
              <h1 className="text-lg font-semibold mb-2">Presets</h1>
              <div className="flex items-center gap-4">
                {PRESETS.map((preset, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => setColors(preset)}
                    className="w-12 h-12 rounded-full border"
                    style={{ backgroundColor: preset.accent }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onSave(colors);
                    onOpenChange(false);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Color picker dialog */}
      <Dialog open={showColorPicker} onOpenChange={setShowColorPicker}>
        <DialogContent className="w-[90%] max-w-[425px] rounded-xl top-[50%] translate-y-[-50%] h-fit">
          <DialogHeader>
            <DialogTitle className="capitalize">
              Pick {currentPicker} color
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-4">
            <HexColorPicker
              color={colors[currentPicker]}
              onChange={(color) =>
                setColors({ ...colors, [currentPicker]: color })
              }
              style={{ width: "100%", height: "200px" }}
            />
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full border"
                style={{ backgroundColor: colors[currentPicker] }}
              />
              <div className="font-mono">{colors[currentPicker]}</div>
            </div>
            <Button
              onClick={() => setShowColorPicker(false)}
              className="w-full"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ColorPickerModal;