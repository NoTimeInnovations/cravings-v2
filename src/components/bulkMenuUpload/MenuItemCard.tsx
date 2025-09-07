import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash, Upload, Loader2 } from "lucide-react";
import { MenuItem, Variant } from "@/components/bulkMenuUpload/EditItemModal"; // Assuming types are here
import { useState } from "react";
import { Input } from "../ui/input";
import Img from "../Img";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";

interface MenuItemCardProps {
  item: MenuItem;
  index: number;
  isUploading: boolean;
  onSelect: () => void;
  onAddToMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onImageClick: (index: number, url: string) => void;
  onCategoryChange: (category: string) => void;
}

export const MenuItemCard = ({
  item,
  isUploading,
  onSelect,
  onAddToMenu,
  onEdit,
  onDelete,
  onCategoryChange,
}: MenuItemCardProps) => {
  const [itemCategory, setItemCategory] = useState(item.category.name);

  const handleCategoryBlur = () => {
    // Only call the prop function when the input loses focus
    // to avoid excessive re-renders on every keystroke.
    onCategoryChange(itemCategory);
  };

  return (
    <Card className="relative flex flex-col h-full bg-white shadow-md rounded-lg overflow-hidden">
      {item.isAdded && (
        <Badge className="absolute top-2 right-2 bg-green-600 text-white z-10">
          Added
        </Badge>
      )}

      <div className="flex justify-between items-start gap-2 px-5 pt-4 pb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Checkbox
            checked={item.isSelected}
            onCheckedChange={onSelect}
            disabled={!item.category || item.isAdded}
            className="mt-1 h-5 w-5"
          />
          <div
            className="font-bold text-lg break-words flex-1"
            title={item.name}
          >
            {item.name}
          </div>
        </div>
        <p className="font-bold text-2xl text-right shrink-0 text-gray-800">
         {
          item.is_price_as_per_size ? (<div className="text-xs">{`(Price as per size)`}</div>) : (<> ₹{item.price}</>)
         }
        </p>
      </div>

      <CardContent className="space-y-4 px-5 flex-grow">
        {item.image && item.image.length > 9 && (
          <div className="relative w-full aspect-video overflow-hidden rounded-md">
            <Img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <p className="text-gray-600 text-sm break-words min-h-[40px]">
          {item.description}
        </p>

       
        {/* Display Variants if they exist */}
        {item.variants && item.variants.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Variants:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              {item.variants.map((variant, index) => (
                <li key={index} className="flex justify-between">
                  <span>{variant.name}</span>
                  <span className="font-medium">₹{variant.price}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 items-center">
          <label
            htmlFor={`category-${item.name}`}
            className="text-sm font-medium shrink-0"
          >
            Category:
          </label>
          <Input
            id={`category-${item.name}`}
            className="flex-1 h-9"
            placeholder="Enter category name"
            value={itemCategory}
            onChange={(e) => setItemCategory(e.target.value)}
            onBlur={handleCategoryBlur} // Update on blur
          />
        </div>
      </CardContent>

      <CardFooter className="flex justify-between px-5 py-4 mt-auto border-t">
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onAddToMenu}
            disabled={item.isAdded || isUploading || !item.category?.name}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
        <Button size="sm" variant="destructive" onClick={onDelete}>
          <Trash className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
