"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { FontSelect } from "./FontSelect";
import { ThemeConfig } from "./hotelDetail/ThemeChangeButton";

interface FontPickerModalProps {
  theme: ThemeConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (font: string) => void;
}

export const fontOptions = [
  { value: "sans-serif", label: "Sans Serif", className: "font-sans" },
  { value: "serif", label: "Serif", className: "font-serif" },
  { value: "monospace", label: "Monospace", className: "font-mono" },
  { value: "inter", label: "Inter", className: "font-inter" },
  { value: "poppins", label: "Poppins", className: "font-poppins" },
  { value: "roboto", label: "Roboto", className: "font-roboto" },
];

export function FontPickerModal({
  theme,
  open,
  onOpenChange,
  onSave,
}: FontPickerModalProps) {
  const [selectedFont, setSelectedFont] = useState(
    String(theme?.fontFamily || "sans-serif")
  );

  const handleSave = () => {
    onSave(selectedFont);
    onOpenChange(false);
    toast.success("Font updated successfully");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] max-w-[425px] rounded-xl top-[50%] translate-y-[-50%]">
        <DialogHeader>
          <DialogTitle>Change Font</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <FontSelect
            options={fontOptions}
            value={selectedFont}
            onChange={setSelectedFont}
          />

          <Button onClick={handleSave} className="mt-4">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
