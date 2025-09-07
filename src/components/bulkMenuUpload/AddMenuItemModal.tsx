import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import CategoryDropdown from "@/components/ui/CategoryDropdown";
import { ImageGridModal } from "./ImageGridModal";
import Img from "../Img";
import { Variant } from "../admin/EditMenuItemModal";
import { X } from "lucide-react";

interface AddMenuItemFormProps {
  onSubmit: (item: {
    name: string;
    price: string;
    image: string;
    description: string;
    category: string;
    variants? : {
      name : string,
      price : number
    }[] | [];
  }) => void;
  onCancel: () => void;
}

export function AddMenuItemForm({ onSubmit, onCancel }: AddMenuItemFormProps) {
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    image: "",
    description: "",
    category: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [newVariant, setNewVariant] = useState<Omit<Variant, "id">>({
    name: "",
    price: 0,
  });
  const [showVariantForm, setShowVariantForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.category) {
      toast.error("Please fill all the required fields");
      return;
    }
    
    // If there are variants, don't require main price. If no variants, require main price
    if (variants.length === 0 && !newItem.price) {
      toast.error("Please set either a base price or add options");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...newItem,
        price: variants.length > 0 ? "0" : newItem.price, // Set price to "0" when variants exist
        variants
      });
      setNewItem({
        name: "",
        price: "",
        image: "",
        description: "",
        category: "",
      });
      setVariants([]);
      setNewVariant({
        name : "",
        price : 0
      })
      setShowVariantForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNewItem({
      name: "",
      price: "",
      image: "",
      description: "",
      category: "",
    });
   
    setVariants([]);
    setNewVariant({
      name : "",
      price : 0
    })
    setShowVariantForm(false);
    onCancel();
  };

  const addVariant = () => {
    if (!newVariant.name || !newVariant.price) {
      alert("Please fill both option name and price");
      return;
    }

    const variant: Variant = {
      ...newVariant,
    };

    setVariants([...variants, variant]);
    setNewVariant({ name: "", price: 0 });
    setShowVariantForm(false);
  };

  const removeVariant = (name: string) => {
    setVariants(variants.filter((v) => v.name !== name));
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 mt-8">
      <h2 className="text-xl font-bold mb-4">Add New Menu Item</h2>
      <form
        id="add-menu-item-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* Image Preview and Selection */}
        {newItem.category && newItem.name && (
          <div className="space-y-2">
            {newItem.image ? (
              <div
                className="relative h-[200px] w-[200px] cursor-pointer"
                onClick={() => setIsImageModalOpen(true)}
              >
                <Img
                  src={newItem.image}
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
        )}

        <ImageGridModal
          isOpen={isImageModalOpen}
          onOpenChange={setIsImageModalOpen}
          itemName={newItem.name}
          category={newItem.category}
          currentImage={newItem.image}
          onSelectImage={(newImageUrl: string) => {
            setNewItem((prev) => ({ ...prev, image: newImageUrl }));
            setIsImageModalOpen(false);
          }}
        />

        <Input
          required
          placeholder="Product Name"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
        />
        
        {/* Show main price input only when no variants exist */}
        {variants.length === 0 && (
          <Input
            required
            type="number"
            placeholder="Price in ₹"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
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
          value={newItem.description}
          onChange={(e) =>
            setNewItem({ ...newItem, description: e.target.value })
          }
        />
        <CategoryDropdown
          value={newItem.category}
          onChange={(value) => setNewItem({ ...newItem, category: value })}
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
              onClick={() => setShowVariantForm(!showVariantForm)}
            >
              {showVariantForm ? "Cancel" : "Add Option"}
            </Button>
          </div>
          
          {showVariantForm && (
            <div className="space-y-2 p-3 border rounded-lg">
              <Input
                placeholder="Variant Name (e.g., Small, Large)"
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
                  setNewVariant({ ...newVariant, price: parseFloat(e.target.value) })
                }
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVariantForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={addVariant}
                >
                  Add
                </Button>
              </div>
            </div>
          )}
          
          {variants.length > 0 && (
            <div className="space-y-2">
              {variants.map((variant) => (
                <div key={variant.name} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{variant.name}</p>
                    <p className="text-sm">₹{variant.price}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVariant(variant.name)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

      

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleCancel} type="button">
            Cancel
          </Button>
          <Button
            disabled={
              !newItem.name ||
              !newItem.category ||
              (variants.length === 0 && !newItem.price) ||
              isSubmitting
            }
            form="add-menu-item-form"
            type="submit"
          >
            {isSubmitting ? "Submitting..." : "Add Item"}
          </Button>
        </div>
      </form>
    </div>
  );
}
