import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import CategoryDropdown from "@/components/ui/CategoryDropdown";
import { ImageGridModal } from "../bulkMenuUpload/ImageGridModal";
import { useAuthStore } from "@/store/authStore";
import { useCategoryStore } from "@/store/categoryStore_hasura";
import Img from "../Img";
import { X, Edit } from "lucide-react";

export interface Variant {
  name: string;
  price: number;
}

interface EditMenuItemFormProps {
  item: {
    id: string;
    name: string;
    price: string;
    image: string;
    description: string;
    category: string;
    variants?: Variant[] | [];
  };
  onSubmit: (item: {
    id: string;
    name: string;
    price: string;
    image: string;
    description: string;
    category: string;
    variants?: Variant[];
  }) => void;
  onCancel: () => void;
}

export function EditMenuItemForm({
  item,
  onSubmit,
  onCancel,
}: EditMenuItemFormProps) {
  const [editingItem, setEditingItem] = useState(item);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variants, setVariants] = useState<Variant[]>(item.variants || []);
  const [newVariant, setNewVariant] = useState<Omit<Variant, "id">>({
    name: "",
    price: 0,
  });
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [showVariantForm, setShowVariantForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem.name || !editingItem.category) {
      alert("Please fill all the required fields");
      return;
    }
    
    // If there are no variants, ensure base price is set
    if (variants.length === 0 && !editingItem.price) {
      alert("Please set either a base price or add options");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...editingItem,
        price: variants.length > 0 ? "0" : editingItem.price, // Set price to "0" when variants exist
        variants: variants.length > 0 ? variants : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addVariant = () => {
    if (!newVariant.name || !newVariant.price) {
      alert("Please fill both option name and price");
      return;
    }
    
    const variant: Variant = {
      ...newVariant
    };
    
    setVariants([...variants, variant]);
    setNewVariant({ name: "", price: 0 });
    setShowVariantForm(false);
  };

  const updateVariant = () => {
    if (editingVariantIndex === null || !newVariant.name || !newVariant.price) {
      alert("Please fill both option name and price");
      return;
    }
    
    const updatedVariants = [...variants];
    updatedVariants[editingVariantIndex] = { ...newVariant };
    
    setVariants(updatedVariants);
    setNewVariant({ name: "", price: 0 });
    setEditingVariantIndex(null);
    setShowVariantForm(false);
  };

  const startEditingVariant = (index: number) => {
    setEditingVariantIndex(index);
    setNewVariant({ ...variants[index] });
    setShowVariantForm(true);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const cancelVariantEdit = () => {
    setNewVariant({ name: "", price: 0 });
    setEditingVariantIndex(null);
    setShowVariantForm(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 mt-8">
      <h2 className="text-xl font-bold mb-4">Edit Menu Item</h2>
      <form id="edit-menu-item-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Image Preview and Selection */}
        <div className="space-y-2">
          {editingItem.image ? (
            <div
              className="relative h-[200px] w-[200px] cursor-pointer mx-auto"
              onClick={() => setIsImageModalOpen(true)}
            >
              <Img
                src={editingItem.image}
                alt="Selected item"
                className="object-cover rounded-lg w-full h-full"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                <p className="text-white">Click to change image</p>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-[200px]"
              onClick={() => setIsImageModalOpen(true)}
            >
              Select Image
            </Button>
          )}
        </div>

        <ImageGridModal
          isOpen={isImageModalOpen}
          onOpenChange={setIsImageModalOpen}
          itemName={editingItem.name}
          category={editingItem.category}
          currentImage={editingItem.image}
          onSelectImage={(newImageUrl: string) => {
            setEditingItem((prev) => ({ ...prev, image: newImageUrl }));
            setIsImageModalOpen(false);
          }}
        />

        <Input
          required
          placeholder="Product Name"
          value={editingItem.name}
          onChange={(e) =>
            setEditingItem({ ...editingItem, name: e.target.value })
          }
        />
        
        {variants.length === 0 && (
          <Input
            type="number"
            placeholder="Base Price in ₹"
            value={editingItem.price}
            onChange={(e) =>
              setEditingItem({ ...editingItem, price: e.target.value })
            }
          />
        )}
        
        {/* Show note when variants exist */}
        {variants.length > 0 && (
          <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded border">
            <p>✅ Pricing will be set through the options below</p>
          </div>
        )}
        
        <Textarea
          placeholder="Product Description"
          value={editingItem.description}
          onChange={(e) =>
            setEditingItem({ ...editingItem, description: e.target.value })
          }
        />
        
        <CategoryDropdown
          value={editingItem.category}
          onChange={(value) => {
            setEditingItem({ ...editingItem, category: value });
          }}
        />

        {/* Variants Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">
              {variants.length > 0 ? "Pricing Options" : "Options"}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingVariantIndex(null);
                setNewVariant({ name: "", price: 0 });
                setShowVariantForm(!showVariantForm);
              }}
            >
              {showVariantForm ? "Cancel" : "Add Option"}
            </Button>
          </div>
          
          {showVariantForm && (
            <div className="space-y-2 p-3 border rounded-lg">
              <Input
                placeholder="Option Name (e.g., Half, Full)"
                value={newVariant.name}
                onChange={(e) =>
                  setNewVariant({ ...newVariant, name: e.target.value })
                }
              />
              <Input
                type="number"
                placeholder="Price in ₹"
                value={newVariant.price}
                onChange={(e) =>
                  setNewVariant({ ...newVariant, price: parseFloat(e.target.value) || 0 })
                }
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={cancelVariantEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={editingVariantIndex !== null ? updateVariant : addVariant}
                >
                  {editingVariantIndex !== null ? "Update" : "Add"}
                </Button>
              </div>
            </div>
          )}
          
          {variants.length > 0 && (
            <div className="space-y-2">
              {variants.map((variant, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{variant.name}</p>
                    <p className="text-sm">₹{variant.price}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditingVariant(index)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVariant(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={onCancel}
            type="button"
          >
            Cancel
          </Button>
          <Button
            disabled={
              !editingItem.name ||
              !editingItem.category ||
              (variants.length === 0 && !editingItem.price) ||
              isSubmitting
            }
            form="edit-menu-item-form"
            type="submit"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface EditMenuItemModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    name: string;
    price: string;
    image: string;
    description: string;
    category: string;
    variants?: Variant[];
  };
  onSubmit: (item: {
    id: string;
    name: string;
    price: string;
    image: string;
    description: string;
    category: string;
    variants?: Variant[];
  }) => void;
  children?: React.ReactNode;
}

export function EditMenuItemModal({
  isOpen,
  onOpenChange,
  item,
  onSubmit,
  children,
}: EditMenuItemModalProps) {
  // We keep this for backwards compatibility, but the component is no longer used directly
  return null;
}