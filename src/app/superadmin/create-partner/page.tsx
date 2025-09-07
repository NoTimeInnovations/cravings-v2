"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocationStore } from "@/store/locationStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  UploadCloud,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  Edit,
  Check,
  X,
} from "lucide-react";
import { useSuperAdminPartnerStore } from "@/store/superAdminPartnerStore";
import { useCreatedPartnerStore } from "@/store/createdPartnerStore";
import ImageEdit from "@/components/superAdmin/createPartner/ImageEdit";

interface MenuItem {
  image?: string;
  category?: string;
  description?: string;
  name: string;
  price: number;
  variants?: { name: string; price: number }[];
  is_price_as_per_size?: boolean;
}

export default function SuperAdminCreatePartnerPage() {
  const router = useRouter();
  const { locationData, countries } = useLocationStore();
  const { partner, setPartner, clearPartner, partnerBanner, setPartnerBanner } =
    useCreatedPartnerStore();
  const {
    createPartner,
    uploadBanner,
    isExtractingMenu,
    extractionError,
    extractedMenuItems,
    extractMenuFromImages,
    retryMenuExtraction,
    clearExtractedMenu,
    isGeneratingImages,
    generateMenuImages,
    generatedImages,
    clearAll,
    isMenuUploaded,
    setIsMenuUploaded,
    updateMenuItem,
    deleteMenuItem,
  } = useSuperAdminPartnerStore();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    hotelName: "",
    area: "",
    phone: "",
    upiId: "",
    isInIndia: true,
    state: "",
    country: "India",
  });

  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [menuImagePreviews, setMenuImagePreviews] = useState<string[]>([]);
  const [menuImageFiles, setMenuImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editedItem, setEditedItem] = useState<Partial<MenuItem>>({});

  const handleCreateAnother = () => {
    clearPartner();
    clearAll();
    clearExtractedMenu();
    setFormData({
      email: "",
      password: "",
      hotelName: "",
      area: "",
      phone: "",
      upiId: "",
      isInIndia: true,
      state: "",
      country: "India",
    });
    setBannerPreview(null);
    setBannerFile(null);
    setMenuImagePreviews([]);
    setMenuImageFiles([]);
    setError(null);
    setIsSubmitting(false);
    setEditingItem(null);
    setEditedItem({});
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleMenuImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setMenuImageFiles(filesArray);
      const previews = filesArray.map((file) => URL.createObjectURL(file));
      setMenuImagePreviews(previews);
    }
  };

  const validateForm = () => {
    if (
      !formData.hotelName ||
      !formData.phone ||
      !formData.country ||
      (formData.isInIndia && (!formData.state || !formData.area))
    ) {
      setError("Please fill in all required business and location fields.");
      return false;
    }
    if (!formData.email || !formData.password || formData.password.length < 6) {
      setError("A valid email and password (min 6 chars) are required.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const newPartner = await createPartner(
        formData.email,
        formData.password,
        formData.hotelName,
        formData.area,
        formData.area,
        formData.phone,
        formData.upiId,
        formData.country,
        formData.state
      );
      setPartner(newPartner);
      toast.success("Partner created successfully!");

      if (bannerFile && bannerPreview) {
        const banner = await uploadBanner(
          newPartner.id,
          bannerFile,
          bannerPreview
        );
        if (banner) {
          setPartnerBanner(banner);
        }
      }

      if (menuImageFiles.length > 0) {
        const menuItems = await extractMenuFromImages(menuImageFiles);
        if (menuItems.length > 0) {
          await generateMenuImages(menuItems);
        }
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err?.message || "An unexpected error occurred.");
      if (!partner) setIsSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateAllImages = async () => {
    if (extractedMenuItems.length > 0) {
      await generateMenuImages(extractedMenuItems);
    }
  };

  const handleUploadMenu = async () => {
    try {
      if (!partner) {
        toast.error("Please create a partner first.");
        return;
      }
      const uploadedCount = await useSuperAdminPartnerStore
        .getState()
        .uploadMenu(partner.id);
      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} menu items uploaded successfully!`);
        setIsMenuUploaded(true);
      } else {
        toast.error("No menu items were uploaded. Please try again.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const startEditing = (item: MenuItem) => {
    setEditingItem(item.name);
    setEditedItem({
      name: item.name,
      price: item.price,
      description: item.description,
      category: item.category,
      variants: [...(item.variants || [])],
      // Preserve the existing image by default
      image: generatedImages[item.name] || item.image,
    });
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditedItem({});
  };

  const saveEditedItem = async () => {
    if (!editingItem) return;

    const itemIndex = extractedMenuItems.findIndex(
      (item) => item.name === editingItem
    );

    if (itemIndex === -1) {
      toast.error("Menu item not found");
      return;
    }

    console.log(editedItem);

    try {
      await updateMenuItem(itemIndex, {
        name: editedItem.name || "",
        price: editedItem.price || 0,
        description: editedItem.description || "",
        category: editedItem.category || "",
        image: editedItem.image || generatedImages[editingItem],
        variants: editedItem.variants,
        is_price_as_per_size: editedItem.is_price_as_per_size || false,
      });
      setEditingItem(null);
      setEditedItem({});
      toast.success("Menu item updated successfully");
    } catch (error) {
      toast.error("Failed to update menu item");
      console.error(error);
    }
  };

  const handleDeleteItem = async (itemName: string) => {
    try {
      const itemIndex = extractedMenuItems.findIndex(
        (item) => item.name === itemName
      );

      if (itemIndex === -1) {
        toast.error("Menu item not found");
        return;
      }

      await deleteMenuItem(itemIndex);
      toast.success("Menu item deleted successfully");
    } catch (error) {
      toast.error("Failed to delete menu item");
      console.error(error);
    }
  };

  const handleVariantChange = (
    index: number,
    field: "name" | "price",
    value: string | number
  ) => {
    if (!editedItem.variants) return;

    const newVariants = [...editedItem.variants];
    newVariants[index] = {
      ...newVariants[index],
      [field]: field === "price" ? Number(value) : value,
    };

    setEditedItem((prev) => ({
      ...prev,
      variants: newVariants,
    }));
  };

  const addVariant = () => {
    setEditedItem((prev) => ({
      ...prev,
      variants: [...(prev.variants || []), { name: "", price: 0 }],
    }));
  };

  const removeVariant = (index: number) => {
    if (!editedItem.variants) return;

    const newVariants = [...editedItem.variants];
    newVariants.splice(index, 1);

    setEditedItem((prev) => ({
      ...prev,
      variants: newVariants.length > 0 ? newVariants : undefined,
    }));
  };

  const handleDeletePartner = async () => {
    try {
      toast.loading("Deleting partner...");
      if (!partner) {
        toast.dismiss();
        toast.error("No partner to delete.");
        return;
      }
      await useCreatedPartnerStore.getState().deletePartner(partner.id);
      toast.dismiss();
      toast.success("Partner deleted successfully!");
      clearPartner();
      clearAll();
      clearExtractedMenu();
    } catch (error) {
      toast.dismiss();
      console.error("Error deleting partner:", error);
      toast.error("Failed to delete partner. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-4xl bg-white p-8">
        <div className="mb-6">
          <Link
            href="/superadmin"
            className="inline-flex items-center gap-2 px-4 py-2 rounded border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition font-medium"
          >
            <ChevronLeft size={20} />
            Back to Dashboard
          </Link>
        </div>

        {!partner ? (
          <>
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
              Create New Partner
            </h2>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="hotelName">Business Name</Label>
                  <Input
                    id="hotelName"
                    placeholder="e.g., The Grand Cafe"
                    value={formData.hotelName}
                    onChange={(e) =>
                      setFormData({ ...formData, hotelName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Login Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter partner's email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="location-type" className="text-sm">
                    Is business in India?
                  </Label>
                  <Switch
                    id="location-type"
                    checked={formData.isInIndia}
                    onCheckedChange={(c) =>
                      setFormData({
                        ...formData,
                        isInIndia: c,
                        state: "",
                        area: "",
                        country: c ? "India" : "",
                      })
                    }
                  />
                </div>
                {formData.isInIndia ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      value={formData.state}
                      onValueChange={(v) =>
                        setFormData({ ...formData, state: v, area: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        {locationData.map((s) => (
                          <SelectItem key={s.state} value={s.state}>
                            {s.state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={formData.area}
                      onValueChange={(v) =>
                        setFormData({ ...formData, area: v })
                      }
                      disabled={!formData.state}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select District" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.state &&
                          locationData
                            .find((s) => s.state === formData.state)
                            ?.districts.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Select
                    value={formData.country}
                    onValueChange={(v) =>
                      setFormData({ ...formData, country: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div>
                  <Label className="mb-2 block">Store Banner (Optional)</Label>
                  <label
                    htmlFor="bannerInput"
                    className="w-full cursor-pointer border-2 border-dashed rounded-lg h-40 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100"
                  >
                    {bannerPreview ? (
                      <img
                        src={bannerPreview}
                        alt="Banner Preview"
                        className="object-cover w-full h-full rounded-lg"
                      />
                    ) : (
                      <div className="text-center text-gray-500">
                        <UploadCloud className="mx-auto h-8 w-8" />
                        <span>Click to upload banner</span>
                      </div>
                    )}
                    <input
                      type="file"
                      id="bannerInput"
                      accept="image/*"
                      onChange={handleBannerChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <Label className="mb-2 block">Menu Images (for AI)</Label>
                  <label
                    htmlFor="menuImagesInput"
                    className="w-full cursor-pointer border-2 border-dashed rounded-lg h-40 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100"
                  >
                    {menuImagePreviews.length > 0 ? (
                      <div className="flex items-center gap-2 p-2">
                        <ImageIcon className="h-8 w-8 text-green-600" />
                        <span className="font-semibold text-gray-700">
                          {menuImagePreviews.length} menu images selected
                        </span>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <UploadCloud className="mx-auto h-8 w-8" />
                        <span>Upload menu pages</span>
                      </div>
                    )}
                    <input
                      type="file"
                      id="menuImagesInput"
                      accept="image/*"
                      multiple
                      onChange={handleMenuImagesChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {extractionError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                  <div className="flex justify-between items-center">
                    <p className="text-red-700">{extractionError}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => retryMenuExtraction()}
                      disabled={isExtractingMenu}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Extraction
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-center">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 text-lg flex items-center justify-center gap-2"
                disabled={
                  isSubmitting || isExtractingMenu || isGeneratingImages
                }
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Create Partner & Process Menu"
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center pt-4">
              <Button
                className={` ${
                  isMenuUploaded
                    ? "cursor-not-allowed bg-green-500"
                    : "bg-orange-600 hover:bg-orange-700"
                }`}
                onClick={isMenuUploaded ? () => {} : handleUploadMenu}
              >
                {isMenuUploaded ? "Menu Uploaded" : "Upload Menu"}
              </Button>
              <Button variant="outline" onClick={handleCreateAnother}>
                Create Another Partner
              </Button>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200 flex flex-col items-center gap-4 ">
              {partnerBanner && (
                <img
                  src={partnerBanner}
                  alt="Partner Banner"
                  className="w-32 h-32 object-fit rounded-md border"
                />
              )}

              <div>
                <h3 className="text-xl font-bold text-green-800">
                  Partner Created: {partner.store_name}
                </h3>
                <p className="text-gray-600">
                  {partner.email} | {partner.phone}
                </p>
                <a
                  className="text-orange-600 underline"
                  target="_blank"
                  href={`https://www.cravings.live/hotels/${
                    partner?.store_name || partner?.name
                  }/${partner?.id}`}
                >
                  Link {"-->"}
                </a>
                <br />
                <Button
                  onClick={handleDeletePartner}
                  className="bg-red-600 hover:bg-red-700 text-white mt-4"
                >
                  Delete This Partner
                </Button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-lg">Extracted Menu Items</h4>
                {extractedMenuItems.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateAllImages}
                    disabled={isGeneratingImages || isMenuUploaded}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate All Images
                  </Button>
                )}
              </div>

              {(isExtractingMenu || isGeneratingImages) && (
                <div className="flex items-center gap-3 text-orange-600 font-medium p-3 bg-orange-50 rounded-md">
                  <Loader2 className="animate-spin" />
                  {isExtractingMenu
                    ? "AI is analyzing your menu images..."
                    : "Generating images for each item..."}
                </div>
              )}

              {extractionError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                  <div className="flex justify-between items-center">
                    <p className="text-red-700">{extractionError}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => retryMenuExtraction()}
                      disabled={isExtractingMenu}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Extraction
                    </Button>
                  </div>
                </div>
              )}

              {extractedMenuItems.length > 0 && (
                <ScrollArea className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                    {extractedMenuItems.map((item) => (
                      <div
                        key={item.name}
                        className="border rounded-lg p-3 shadow-sm bg-white relative"
                      >
                        {editingItem === item.name ? (
                          <div className="space-y-3">
                            <div className="w-full h-32 bg-gray-200 rounded-md flex items-center justify-center mb-2">
                              {generatedImages[item.name] ||
                              editedItem.image ? (
                                <ImageEdit
                                  onChange={(img: string) => {
                                    setEditedItem({
                                      ...editedItem,
                                      image: img,
                                    });
                                  }}
                                  editedItem={editedItem}
                                  generatedImages={generatedImages}
                                  item={item}
                                  key={item.name}
                                />
                              ) : (
                                <div className="flex flex-col items-center text-gray-500 text-xs">
                                  <ImageIcon className="h-5 w-5 mb-1" />
                                  <span>No image available</span>
                                </div>
                              )}
                            </div>

                            <Input
                              value={editedItem.name || ""}
                              onChange={(e) =>
                                setEditedItem({
                                  ...editedItem,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Item name"
                            />
                            {(editedItem.is_price_as_per_size ??
                              item.is_price_as_per_size) !== true && (
                              <Input
                                type="number"
                                value={editedItem.price || 0}
                                onChange={(e) =>
                                  setEditedItem({
                                    ...editedItem,
                                    price: Number(e.target.value),
                                  })
                                }
                                placeholder="Price"
                              />
                            )}
                            <Input
                              value={editedItem.description || ""}
                              onChange={(e) =>
                                setEditedItem({
                                  ...editedItem,
                                  description: e.target.value,
                                })
                              }
                              placeholder="Description"
                            />
                            <Input
                              value={editedItem.category || ""}
                              onChange={(e) =>
                                setEditedItem({
                                  ...editedItem,
                                  category: e.target.value,
                                })
                              }
                              placeholder="Category"
                            />

                            <div className="flex items-center mt-3">
                              <label className="mr-2 text-sm">
                                Is Price as per Size:
                              </label>
                              <Switch
                                checked={
                                  editedItem.hasOwnProperty(
                                    "is_price_as_per_size"
                                  )
                                    ? editedItem.is_price_as_per_size
                                    : item.is_price_as_per_size
                                }
                                onCheckedChange={(value) => {
                                  setEditedItem({
                                    ...editedItem,
                                    is_price_as_per_size: value,
                                  });
                                }}
                              />
                            </div>

                            {(editedItem.variants || []).length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">
                                  Variants
                                </h4>
                                {editedItem.variants?.map(
                                  (variant: any, index: number) => (
                                    <div
                                      key={index}
                                      className="flex gap-2 items-center"
                                    >
                                      <Input
                                        value={variant.name}
                                        onChange={(e) =>
                                          handleVariantChange(
                                            index,
                                            "name",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Variant name"
                                        className="flex-1"
                                      />
                                      <Input
                                        type="number"
                                        value={variant.price}
                                        onChange={(e) =>
                                          handleVariantChange(
                                            index,
                                            "price",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Price"
                                        className="w-20"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeVariant(index)}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        <Trash2 size={16} />
                                      </Button>
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={addVariant}
                              className="w-full"
                            >
                              Add Variant
                            </Button>

                            <div className="flex gap-2 pt-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={saveEditedItem}
                                className="flex-1"
                              >
                                <Check size={16} className="mr-2" />
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelEditing}
                                className="flex-1"
                              >
                                <X size={16} className="mr-2" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="absolute top-2 right-2 flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => startEditing(item)}
                                className="h-8 w-8 text-gray-500 hover:text-gray-700 bg-white p-1"
                                disabled={isMenuUploaded}
                              >
                                <Edit size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteItem(item.name)}
                                className="h-8 w-8 text-red-500 hover:text-red-700 bg-white p-1"
                                disabled={isMenuUploaded}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>

                            <div className="w-full h-32 bg-gray-200 rounded-md flex items-center justify-center mb-2">
                              {generatedImages[item.name] || item.image ? (
                                <img
                                  src={item.image || generatedImages[item.name]}
                                  alt={item.name}
                                  className="w-full h-full object-cover rounded-md"
                                />
                              ) : (
                                <div className="flex flex-col items-center text-gray-500 text-xs">
                                  <ImageIcon className="h-5 w-5 mb-1" />
                                  <span>No image available</span>
                                </div>
                              )}
                            </div>
                            <h5 className="font-bold truncate">{item.name}</h5>
                            <p className="text-sm font-medium">
                              {item.is_price_as_per_size ? (
                                <>{`(Price as per size)`}</>
                              ) : (
                                <> ₹{item.price.toFixed(2)}</>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">
                              {item.category}
                            </p>
                            <p className="text-sm text-gray-500">
                              {item.description}
                            </p>

                            {(item?.variants ?? [])?.length > 0 && (
                              <div>
                                <h6 className="font-semibold mt-2">Options:</h6>
                                <ul className="list-disc list-inside text-sm text-gray-600">
                                  {(item?.variants ?? []).map(
                                    (variant, index) => (
                                      <li key={index}>
                                        {variant.name} - ₹
                                        {variant.price.toFixed(2)}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
