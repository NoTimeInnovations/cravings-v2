import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ThemeConfig } from "./ThemeChangeButton";

interface MenuStyleModalProps {
  theme: ThemeConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (style: string) => void;
}

export const MENUSTYLES = [
  { id: "default", name: "Default Style" },
  { id: "compact", name: "Compact Style" }
];

const MenuStyleModal = ({ open, onOpenChange, onSave , theme }: MenuStyleModalProps) => {
  const [selectedStyle, setSelectedStyle] = React.useState<string>(theme?.menuStyle || "default");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90%] max-w-[425px] top-[50%] translate-y-[-50%] rounded-xl h-fit">
        <DialogHeader>
          <DialogTitle>Menu Style Customization</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            {MENUSTYLES.map((style) => (
              <Button
                key={style.id}
                variant={selectedStyle === style.id ? "default" : "outline"}
                onClick={() => setSelectedStyle(style.id)}
                className="h-16"
              >
                {style.name}
              </Button>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              onSave(selectedStyle);
              onOpenChange(false);
            }}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MenuStyleModal;