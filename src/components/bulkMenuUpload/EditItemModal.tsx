import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageGridModal } from "./ImageGridModal";
import { useState, useEffect } from "react";
import Img from "../Img";
import { PlusCircle, Trash2 } from "lucide-react";
import { Switch } from "../ui/switch";

// --- TYPE DEFINITIONS ---
export interface Variant {
  name: string;
  price: number;
}

export interface MenuItem {
  id?: string;
  name: string;
  price: number;
  image: string;
  description: string;
  isAdded?: boolean;
  isSelected?: boolean;
  category: {
    name: string;
    id: string;
    priority: number;
  };
  variants?: Variant[];
  is_price_as_per_size?: boolean;
}

interface EditItemModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: { index: number; item: MenuItem } | null;
  onSave: () => void;
  // The 'value' type is changed to 'any' to accommodate the 'variants' array,
  // which is more complex than a simple string or number.
  onEdit: (field: keyof MenuItem, value: any) => void;
}

export const EditItemModal = ({
  isOpen,
  onOpenChange,
  editingItem,
  onSave,
  onEdit,
}: EditItemModalProps) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  // Local state to manage variants during editing
  const [variants, setVariants] = useState<Variant[]>([]);

  useEffect(() => {
    // When the modal opens or the item changes, sync the local variants state
    if (editingItem) {
      setVariants(editingItem.item.variants || []);
    }
  }, [editingItem]);

  if (!editingItem || !isOpen) return null;

  // --- HANDLER FUNCTIONS FOR VARIANTS ---

  const handleVariantChange = (
    index: number,
    field: keyof Variant,
    value: string | number
  ) => {
    const newVariants = [...variants];
    // Ensure price is stored as a number
    const finalValue =
      field === "price" ? parseFloat(value as string) || 0 : value;
    newVariants[index] = { ...newVariants[index], [field]: finalValue };
    setVariants(newVariants);
    onEdit("variants", newVariants);
  };

  const addVariant = () => {
    setVariants([...variants, { name: "", price: 0 }]);
  };

  const removeVariant = (index: number) => {
    const filteredVariants = variants.filter((_, i) => i !== index);
    setVariants(filteredVariants);
    onEdit("variants", filteredVariants);
  };

  const handleSave = () => {
    onSave();
  };

  return (
    <>
      {/* Inline Edit Form */}
      <div className="bg-white p-5 rounded-lg border shadow-md w-full animate-in fade-in-0 duration-150">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Edit: {editingItem.item.name}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            <span className="text-2xl font-light">×</span>
          </Button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4"
        >
          {/* Image Selection */}
          <div className="w-full flex justify-center mb-2">
            {editingItem.item.image ? (
              <div
                className="relative h-[160px] w-[160px] cursor-pointer overflow-hidden rounded-lg group"
                onClick={() => setIsImageModalOpen(true)}
              >
                <Img
                  src={editingItem.item.image}
                  alt="Selected item"
                  className="object-cover h-full w-full rounded-lg"
                  sizes="160px"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-semibold">
                    Change Image
                  </p>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-[160px] h-[160px]"
                onClick={() => setIsImageModalOpen(true)}
              >
                Select Image
              </Button>
            )}
          </div>

          {/* Form Fields */}
          <div>
            <label htmlFor="name" className="text-sm font-medium mb-1 block">
              Name
            </label>
            <Input
              id="name"
              value={editingItem.item.name}
              onChange={(e) => onEdit("name", e.target.value)}
              placeholder="Item name"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="text-sm font-medium mb-1 block"
            >
              Description
            </label>
            <Textarea
              id="description"
              value={editingItem.item.description}
              onChange={(e) => onEdit("description", e.target.value)}
              className="min-h-[80px]"
              placeholder="Item description"
            />
          </div>

          {!editingItem.item.is_price_as_per_size && (
            <div>
              <label htmlFor="price" className="text-sm font-medium mb-1 block">
                Base Price
              </label>
              <Input
                id="price"
                value={editingItem.item.price}
                type="number"
                step="0.01"
                min="0"
                onChange={(e) =>
                  onEdit("price", parseFloat(e.target.value) || 0)
                }
                placeholder="0.00"
              />
            </div>
          )}

          <div className="flex items-center mt-3">
            <label className="mr-2">Is Price as per Size:</label>
            <Switch
              checked={editingItem.item.is_price_as_per_size}
              onCheckedChange={async () => {
                onEdit(
                  "is_price_as_per_size",
                  !editingItem.item.is_price_as_per_size
                );
              }}
            />
          </div>

          {/* --- Variants Section --- */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Variants</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addVariant}
                className="text-blue-600 hover:text-blue-700"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Variant
              </Button>
            </div>
            <div className="space-y-2 rounded-md border p-4 bg-gray-50">
              {variants.map((variant, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 animate-in fade-in-0 duration-300"
                >
                  <Input
                    placeholder="Variant name (e.g., Half)"
                    value={variant.name}
                    onChange={(e) =>
                      handleVariantChange(index, "name", e.target.value)
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Price"
                    value={variant.price}
                    onChange={(e) =>
                      handleVariantChange(index, "price", e.target.value)
                    }
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeVariant(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {variants.length === 0 && (
                <p className="text-sm text-center text-gray-500 py-2">
                  No variants added.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </div>

      {/* Image Selection Modal */}
      <ImageGridModal
        isOpen={isImageModalOpen}
        onOpenChange={setIsImageModalOpen}
        itemName={editingItem.item.name}
        category={editingItem.item.category.name.toLowerCase()}
        currentImage={editingItem.item.image}
        onSelectImage={(newImageUrl: string) => {
          onEdit("image", newImageUrl);
          setIsImageModalOpen(false);
        }}
      />
    </>
  );
};
