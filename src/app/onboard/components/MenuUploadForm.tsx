"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { 
  PlusCircle, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Image as ImageIcon, 
  Edit, 
  Plus, 
  X,
  Smartphone
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import { MenuItem, BusinessRegistrationData } from "../page";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Custom CSS for hiding scrollbar
const hideScrollbarStyle = {
  scrollbarWidth: 'none' as const,  /* Firefox */
  msOverflowStyle: 'none' as const,  /* Internet Explorer 10+ */
};

// Custom CSS for hiding WebKit/Chrome scrollbar
// const hideWebkitScrollbarCSS = `
//   &::-webkit-scrollbar {
//     display: none;
//   }
// `;

interface MenuUploadFormProps {
  menuItems: MenuItem[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  onNext: () => void;
  onPrevious: () => void;
  businessData?: BusinessRegistrationData;
}

// Local storage keys (now handled in the parent component)
// Keeping the constants for now for backward compatibility
// const LS_MENU_ITEMS = "cravings_onboard_menu_items";
const LS_CATEGORIES = "cravings_onboard_categories";

export default function MenuUploadForm({
  menuItems,
  setMenuItems,
  onNext,
  onPrevious,
  businessData,
}: MenuUploadFormProps) {
  const defaultItem: Omit<MenuItem, "id"> = {
    name: "",
    price: 0,
    description: "",
    image: "",
    mustTry: false,
    category: "Uncategorized",
  };
  
  const [newItem, setNewItem] = useState<Omit<MenuItem, "id">>({...defaultItem});
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(["Uncategorized", "Starters", "Main Course", "Desserts"]);
  const [newCategory, setNewCategory] = useState<string>("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [activePreviewCategory, setActivePreviewCategory] = useState<string | null>(null);
  
  // Load categories from local storage on component mount
  useEffect(() => {
    try {
      const storedCategories = localStorage?.getItem(LS_CATEGORIES);
      if (storedCategories) {
        const parsedCategories = JSON.parse(storedCategories) as string[];
        setCategories(parsedCategories);
      }
    } catch (error) {
      console.error("Error loading categories from local storage:", error);
    }
  }, []);
  
  // Save categories to local storage whenever they change
  useEffect(() => {
    try {
      localStorage?.setItem(LS_CATEGORIES, JSON.stringify(categories));
    } catch (error) {
      console.error("Error saving categories to local storage:", error);
    }
  }, [categories]);

  // Group menu items by category for the mobile preview
  const menuItemsByCategory = menuItems.reduce((acc, item) => {
    const category = item.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  // Filter items based on selected category or show all
  const filteredMenuItems = activePreviewCategory 
    ? { [activePreviewCategory]: menuItemsByCategory[activePreviewCategory] || [] }
    : menuItemsByCategory;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setNewItem({...defaultItem});
    setSelectedImage(null);
    setImagePreview(null);
    setIsEditing(false);
    setEditingItemId(null);
  };

  const handleAddItem = async () => {
    try {
      setError(null);
      
      // Validate required fields
      if (!newItem.name || !newItem.price) {
        setError("Name and price are required");
        return;
      }

      // Check if we have reached the maximum number of items
      if (!isEditing && menuItems.length >= 7) {
        setError("You can only add up to 7 menu items");
        return;
      }

      // Instead of uploading to S3, we'll just store the image preview URL locally
      // This will be a base64 string that can be displayed in the UI
      const imageUrl = imagePreview || newItem.image || "";

      if (isEditing && editingItemId) {
        // Update existing item
        setMenuItems((prev) => 
          prev.map(item => 
            item.id === editingItemId 
              ? { 
                  ...item, 
                  name: newItem.name,
                  price: newItem.price,
                  description: newItem.description,
                  image: imageUrl,
                  mustTry: newItem.mustTry || false,
                  category: newItem.category || "Uncategorized",
                }
              : item
          )
        );
      } else {
      // Add new item with unique ID
      const newMenuItem: MenuItem = {
        id: uuidv4(),
        name: newItem.name,
        price: newItem.price,
        description: newItem.description,
        image: imageUrl,
          mustTry: newItem.mustTry || false,
          category: newItem.category || "Uncategorized",
      };

      setMenuItems((prev) => [...prev, newMenuItem]);
      }

      // Reset form
      resetForm();
    } catch (error) {
      console.error("Error adding menu item:", error);
      setError("An error occurred. Please try again.");
    }
  };

  const handleEditItem = (id: string) => {
    const itemToEdit = menuItems.find(item => item.id === id);
    if (itemToEdit) {
      setNewItem({
        name: itemToEdit.name,
        price: itemToEdit.price,
        description: itemToEdit.description,
        image: itemToEdit.image,
        mustTry: itemToEdit.mustTry || false,
        category: itemToEdit.category || "Uncategorized",
      });
      setImagePreview(itemToEdit.image || null);
      setIsEditing(true);
      setEditingItemId(id);
    }
  };

  const handleRemoveItem = (id: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
    
    // If we're currently editing this item, reset the form
    if (editingItemId === id) {
      resetForm();
    }
  };

  const handleNextStep = () => {
    if (menuItems.length === 0) {
      setError("Please add at least one menu item");
      return;
    }
    onNext();
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      return;
    }
    
    if (categories.includes(newCategory.trim())) {
      setError("This category already exists");
      return;
    }
    
    setCategories(prev => [...prev, newCategory.trim()]);
    setNewCategory("");
    setAddingCategory(false);
  };
  
  const handleRemoveCategory = (category: string) => {
    // Don't allow removing "Uncategorized"
    if (category === "Uncategorized") return;
    
    // Move items from this category to "Uncategorized"
    setMenuItems(prev => 
      prev.map(item => 
        item.category === category 
          ? { ...item, category: "Uncategorized" } 
          : item
      )
    );
    
    // Remove the category
    setCategories(prev => prev.filter(c => c !== category));
  };

  // Toggle an item's mustTry status
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const toggleMustTry = (id: string) => {
    setMenuItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, mustTry: !item.mustTry } : item
      )
    );
  };
  /* eslint-enable @typescript-eslint/no-unused-vars */

  return (
    <div className="space-y-6">
      <div className="space-y-2">
      <h2 className="text-2xl font-semibold">Menu Upload</h2>
      <p className="text-gray-500">
          Add up to 7 of your best menu items to showcase your business.
      </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Two-column layout with cards side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left card - Menu Editor (70%) */}
        <Card className="p-4 bg-white lg:col-span-7">
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">Menu Editor</h3>
              <div className="text-xs text-gray-500">
                Added Items: <span className="font-medium">{menuItems.length}/7</span>
              </div>
            </div>
            
            {/* Categories management - Collapsed into a dropdown with inline editing */}
            <div className="border-b pb-3 mb-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="text-sm font-medium text-gray-700">Categories:</span>
                {categories.map(category => (
                  <div key={category} className="flex items-center">
                    <Badge 
                      variant={category === "Uncategorized" ? "secondary" : "outline"}
                      className="text-xs py-0 h-6"
                    >
                      {category}
                      {category !== "Uncategorized" && (
                        <button 
                          className="ml-1 hover:text-red-500"
                          onClick={() => handleRemoveCategory(category)}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </Badge>
                  </div>
                ))}
                <button 
                  className="inline-flex items-center h-6 rounded-full bg-gray-100 hover:bg-gray-200 px-2 text-xs text-gray-700"
                  onClick={() => setAddingCategory(!addingCategory)}
                >
                  {addingCategory ? <X size={10} className="mr-1" /> : <Plus size={10} className="mr-1" />}
                  {addingCategory ? "Cancel" : "Add"}
                </button>
              </div>
              
              {addingCategory && (
                <div className="flex items-center gap-2">
                  <Input 
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)} 
                    placeholder="New category name"
                    className="flex-1 h-8 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <Button 
                    onClick={handleAddCategory} 
                    size="sm" 
                    className="h-8"
                    disabled={!newCategory.trim()}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>

            {/* Menu item form - Streamlined with better visual grouping */}
            <div className="border rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="name" className="text-xs mb-1 block text-gray-700">Item Name*</Label>
                  <Input
                    id="name"
                    placeholder="Enter item name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div>
                  <Label htmlFor="price" className="text-xs mb-1 block text-gray-700">Price*</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="Enter price"
                    value={newItem.price || ""}
                    onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="category" className="text-xs mb-1 block text-gray-700">Category</Label>
                  <Select 
                    value={newItem.category || "Uncategorized"}
                    onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                  >
                    <SelectTrigger id="category" className="h-9">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                

                <div className="col-span-1">
                  <Label htmlFor="description" className="text-xs mb-1 block text-gray-700">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter item description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    className="h-[100px] resize-none text-sm"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="must-try"
                      checked={newItem.mustTry || false}
                      onCheckedChange={(checked) => setNewItem({ ...newItem, mustTry: checked })}
                      className="data-[state=checked]:bg-orange-500"
                    />
                    <Label htmlFor="must-try" className="text-xs font-medium">
                      <span className="text-black">Must</span>
                      <span className="text-orange-500">Try</span>
                    </Label>
                    <span className="text-xs text-gray-500">(Highlight as special item)</span>
                  </div>
                </div>
                <div className="col-span-2 relative">
                  <Label htmlFor="image" className="text-xs mb-1 block text-gray-700">Item Image</Label>
                  <div className="h-[100px] flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-md relative bg-gray-50 hover:bg-gray-100 transition-colors">
                    {imagePreview ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={imagePreview}
                          alt="Preview"
                          fill
                          className="object-contain p-1"
                        />
                        <button 
                          onClick={() => {
                            setImagePreview(null);
                            setSelectedImage(null);
                            setNewItem({...newItem, image: ""});
                          }}
                          className="absolute top-1 right-1 bg-white/80 hover:bg-white rounded-full p-0.5"
                          type="button"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <ImageIcon className="w-6 h-6 mb-1" />
                        <p className="text-xs">Click to upload</p>
                      </div>
                    )}
                    <input
                      type="file"
                      id="image"
                      accept="image/*"
                      className="absolute inset-0 w-0 h-0 opacity-0"
                      onChange={handleImageChange}
                    />
                    <label 
                      htmlFor="image" 
                      className="absolute inset-0 cursor-pointer"
                      aria-label="Upload image"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleAddItem} 
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        disabled={!newItem.name || !newItem.price}
                      >
                        <Edit size={16} className="mr-1.5" /> Update Item
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={resetForm}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleAddItem} 
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={!newItem.name || !newItem.price}
                    >
                      <Plus size={16} className="mr-1.5" /> Add to Menu
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Menu items list - More visually distinct */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Added Items ({menuItems.length}/7)</h4>
              
              {menuItems.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-md bg-gray-50">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <PlusCircle className="w-8 h-8 mb-1 opacity-50" />
                    <p className="text-sm">No items added yet</p>
                    <p className="text-xs">Add your first menu item above</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2 rounded-md border ${item.mustTry ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 relative rounded overflow-hidden bg-gray-100 border border-gray-200">
                          {item.image ? (
                            <Image src={item.image} alt={item.name} fill className="object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <h4 className="font-medium text-sm">{item.name}</h4>
                            {item.mustTry && (
                              <Badge className="bg-orange-500 text-white text-[10px] py-0 px-1.5">Must Try</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium">₹{item.price}</span>
                            <span className="text-gray-300">•</span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-gray-200 text-gray-500">{item.category}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditItem(item.id)}
                          className="h-7 w-7 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
        
        {/* Right card - Live Preview (30%) */}
        <Card className="p-6 bg-white lg:col-span-3">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Live Preview</h3>
              <Badge variant="outline" className="text-xs">
                <Smartphone className="w-3 h-3 mr-1" /> Mobile View
              </Badge>
            </div>
            
            <div className="flex justify-center py-4">
              <div className="relative">
                {/* Phone frame image */}
                <div className="relative w-[300px] h-[610px]">
                  <Image 
                    src="/phone_frame.png" 
                    alt="Phone frame" 
                    fill 
                    className="object-contain"
                  />
                  
                  {/* Screen content - positioned within the frame */}
                  <div className="absolute top-[50px] left-[17px] right-[17px] bottom-[23px] overflow-hidden rounded-[28px]">
                    <div className="h-full w-full overflow-y-auto bg-white scrollbar-hide" style={hideScrollbarStyle}>
                      {/* Restaurant header */}
                      <div className="bg-white p-3 border-b border-gray-200">
                        <div className="flex items-center">
                          <div className="flex items-center gap-2">
                            <div className="relative w-6 h-6">
                              <Image 
                                src="/icon-64x64.png" 
                                alt="Cravings Logo" 
                                fill 
                                className="object-contain"
                              />
                            </div>
                            <span className="font-bold text-xl text-orange-500">Cravings</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Restaurant info */}
                      {businessData?.businessName && (
                        <div className="p-3 flex items-center gap-3 border-b border-gray-100">
                          <div className="h-12 w-12 relative rounded-full overflow-hidden border border-gray-200">
                            {businessData?.logo ? (
                              <Image 
                                src={businessData.logo} 
                                alt={businessData.businessName} 
                                fill 
                                className="object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                                <span className="text-lg font-bold text-gray-400">
                                  {businessData.businessName.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <h1 className="font-bold text-lg">{businessData.businessName}</h1>
                            <p className="text-xs text-gray-500">{businessData.area}, {businessData.district}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Must try section - only if there are must-try items */}
                      {menuItems.some(item => item.mustTry) && (
                        <div className="p-3 border-b">
                          <h2 className="font-bold text-base mb-2">Must<span className="text-orange-500">Try</span></h2>
                          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide" style={hideScrollbarStyle}>
                            {menuItems
                              .filter(item => item.mustTry)
                              .map(item => (
                                <div key={`must-try-${item.id}`} className="min-w-[120px] border rounded-lg overflow-hidden">
                                  <div className="h-20 relative">
                                    {item.image ? (
                                      <Image 
                                        src={item.image} 
                                        alt={item.name} 
                                        fill
                                        className="object-cover" 
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gray-100"></div>
                                    )}
                                  </div>
                                  <div className="p-2">
                                    <p className="text-xs font-medium truncate">{item.name}</p>
                                    <p className="text-xs text-orange-500 font-bold">₹{item.price}</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Categories tabs */}
                      <div className="px-3 py-2 border-b">
                        <div 
                          className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide" 
                          style={hideScrollbarStyle}
                        >
                          <div 
                            className={`${!activePreviewCategory ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'} px-3 py-1 rounded-full text-xs whitespace-nowrap cursor-pointer`}
                            onClick={() => setActivePreviewCategory(null)}
                          >
                            All items
                          </div>
                          {Object.keys(menuItemsByCategory)
                            .filter(cat => cat !== "Uncategorized")
                            .map(cat => (
                              <div 
                                key={`cat-${cat}`} 
                                className={`${activePreviewCategory === cat ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'} px-3 py-1 rounded-full text-xs whitespace-nowrap cursor-pointer`}
                                onClick={() => setActivePreviewCategory(cat)}
                              >
                                {cat}
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {/* Menu items by category */}
                      <div className="py-2">
                        {Object.keys(filteredMenuItems).length === 0 ? (
                          <div className="p-4 text-center text-gray-400 text-xs">
                            No menu items added
                          </div>
                        ) : (
                          Object.entries(filteredMenuItems).map(([category, items]) => (
                            <div key={`category-${category}`} className="mb-4">
                              <h3 className="text-xs font-bold uppercase text-gray-500 px-3 mb-1">{category}</h3>
                              <div className="space-y-2">
                                {items.map(item => (
                                  <div key={`preview-${item.id}`} className="flex px-3 py-2">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{item.name}</p>
                                      {item.description && (
                                        <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                                      )}
                                      <p className="text-sm font-bold mt-1">₹{item.price}</p>
                                    </div>
                                    <div className="w-16 h-16 rounded overflow-hidden ml-2">
                                      {item.image ? (
                                        <Image 
                                          src={item.image} 
                                          alt={item.name} 
                                          width={64}
                                          height={64}
                                          className="w-full h-full object-cover" 
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gray-100"></div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-center text-sm text-gray-500">
                  <p>This is how your menu will appear in the Cravings app</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        <Button onClick={handleNextStep}>
          Next <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 