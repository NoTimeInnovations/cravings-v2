"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  ImageIcon,
  Loader2,
  Trash2,
  UploadCloud,
  Pencil,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { MenuItemCard } from "@/components/bulkMenuUpload/MenuItemCard";
import { EditItemModal } from "@/components/bulkMenuUpload/EditItemModal";
import { useBulkUpload } from "@/hooks/useBulkUpload";
import { useAuthStore } from "@/store/authStore";
import { KimiAiLink } from "@/components/ui/KimiAiLink";
import { useMenuStore } from "@/store/menuStore_hasura";
import { toast } from "sonner";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { processImage } from "@/lib/processImage";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import axios from "axios";

const BulkUploadPage = () => {
  const router = useRouter();
  const { userData } = useAuthStore();
  const { fetchMenu } = useMenuStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingMenu, setIsDeletingMenu] = useState(false);
  const [inputMode, setInputMode] = useState<'image' | 'text'>('image');
  const [activeTab, setActiveTab] = useState<'bulk-upload' | 'add-images'>('bulk-upload');
  const [existingMenuItems, setExistingMenuItems] = useState<any[]>([]);
  const [selectedExistingItems, setSelectedExistingItems] = useState<string[]>([]);
  const [isLoadingExistingItems, setIsLoadingExistingItems] = useState(false);
  const [isUploadingImagesForExisting, setIsUploadingImagesForExisting] = useState(false);
  const [isEditingExistingItem, setIsEditingExistingItem] = useState(false);
  const [editingExistingItem, setEditingExistingItem] = useState<any>(null);
  const [isDeletingExistingItem, setIsDeletingExistingItem] = useState<string | null>(null);

  const {
    loading,
    jsonInput,
    menuItems: bulkMenuItems,
    selectAll,
    isEditModalOpen,
    isUploading,
    isBulkUploading,
    editingItem,
    setJsonInput,
    handleJsonSubmit,
    handleClear,
    handleAddToMenu,
    handleDelete,
    handleSelectAll,
    handleSelectItem,
    handleUploadSelected,
    handleEdit,
    handleSaveEdit,
    handleImageClick,
    setIsEditModalOpen,
    setEditingItem,
    handleCategoryChange,
    handleGenerateImages,
    handlePartialImageGeneration,
    handleGenerateAIImages,
    menuImagePreviews,
    handleMenuImagesChange,
    isExtractingMenu,
    setIsExtractingMenu,
    menuImageFiles,
    extractedMenuItems,
    handleExtractMenuItemsFromImage,
  } = useBulkUpload();

  const processBatch = async (endpoint: string, items: any[]) => {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/image-gen/${endpoint}`,
      items,
      { headers: { "Content-Type": "application/json" } }
    );
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    throw new Error(`Invalid response from ${endpoint} server`);
  };

  // Load all existing menu items (with and without images)
  const loadExistingMenuItems = async () => {
    if (!userData?.id) return;
    setIsLoadingExistingItems(true);
    try {
      const response = await fetchFromHasura(
        `query GetAllMenuItems($partner_id: uuid!) {
          menu(where: {partner_id: {_eq: $partner_id}, deletion_status: {_eq: 0}}) {
            id
            name
            price
            description
            image_url
            category {
              id
              name
              priority
            }
            variants
            is_price_as_per_size
          }
        }`,
        { partner_id: userData.id }
      );
      setExistingMenuItems(response?.menu || []);
    } catch (error) {
      console.error("Error loading existing menu items:", error);
      toast.error("Failed to load existing menu items");
    } finally {
      setIsLoadingExistingItems(false);
    }
  };

  // Handle selection of existing items
  const handleExistingItemSelect = (itemId: string) => {
    setSelectedExistingItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const BATCH_SIZE = 2;

  const handleBulkImageGenerationForExisting = async (mode: 'full' | 'partial' | 'ai') => {
    const itemsToProcess = existingMenuItems.filter(item =>
      selectedExistingItems.includes(item.id) && (!item.image_url || item.image_url === "")
    );
    if (itemsToProcess.length === 0) {
      toast.error("Please select items without images to generate images for");
      return;
    }

    setIsUploadingImagesForExisting(true);
    try {
      let endpoint = "";
      let successMessage = "";
      if (mode === "full") {
        endpoint = "fullImages";
        successMessage = "Full images generated successfully!";
      }
      if (mode === "partial") {
        endpoint = "partialImages";
        successMessage = "Partial images generated successfully!";
      }
      if (mode === "ai") {
        endpoint = "generateAIImages";
        successMessage = "AI images generated successfully!";
      }

      let processedCount = 0;
      for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
        const batch = itemsToProcess.slice(i, i + BATCH_SIZE);

        toast.info(
          `Processing items ${i + 1}-${Math.min(i + BATCH_SIZE, itemsToProcess.length)} of ${itemsToProcess.length}...`
        );

        // Prepare items for the API
        const itemsForApi = batch.map(item => ({
          name: item.name,
          category: item.category.name,
          description: item.description,
          price: item.price,
          variants: item.variants,
        }));

        // 1. Generate images in batch
        const batchResults = await processBatch(endpoint, itemsForApi);

        // 2. For each result, upload to S3 and update the menu item
        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          const result = batchResults[j];
          if (result && result.image) {
            try {
              const processedImage = await processImage(result.image, "generated");
              const formattedName = item.name.replace(/[^a-zA-Z0-9]/g, "_").replace(/\s+/g, "_").replace(/_+/g, "_");
              const formattedCategory = item.category.name.replace(/[^a-zA-Z0-9]/g, "_").replace(/\s+/g, "_").replace(/_+/g, "_");
              const s3Url = await uploadFileToS3(
                processedImage,
                `${item.partner_id}/menu/${formattedName}_${formattedCategory}_${Date.now()}.webp`
              );
              // Update the menu item in the database
              await fetchFromHasura(
                `mutation UpdateMenuItemImage($id: uuid!, $image_url: String!) {
                  update_menu_by_pk(
                    pk_columns: { id: $id }
                    _set: { image_url: $image_url }
                  ) {
                    id
                    image_url
                  }
                }`,
                { id: item.id, image_url: s3Url }
              );
              processedCount++;
            } catch (err) {
              console.error(`Failed to process image for ${item.name}:`, err);
              toast.error(`Failed to generate image for ${item.name}`);
              continue;
            }
          }
        }
      }

      toast.success(`${successMessage} Processed ${processedCount} items.`);
      await loadExistingMenuItems();
      setSelectedExistingItems([]);
    } catch (error) {
      toast.error("Failed to generate images for some items");
      console.error(error);
    } finally {
      setIsUploadingImagesForExisting(false);
    }
  };

  // Generate image for a specific item
  const generateImageForItem = async (item: any, mode: 'full' | 'partial' | 'ai'): Promise<string> => {
    // This is a placeholder implementation
    // In a real implementation, you would integrate with your image generation service
    // For now, we'll return a placeholder image URL
    
    const prompt = `A professional food photograph of ${item.name}, ${item.description || ''}, high quality, appetizing, restaurant menu style`;
    
    // Simulate image generation delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return a placeholder image URL (in real implementation, this would be the generated image)
    return `https://via.placeholder.com/400x300/FF6B35/FFFFFF?text=${encodeURIComponent(item.name)}`;
  };

  // Update menu item with new image
  const updateMenuItemImage = async (itemId: string, imageUrl: string) => {
    try {
      // Convert image URL to blob and upload to S3
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Upload to S3 (you'll need to implement this based on your existing S3 upload logic)
      const s3Url = await uploadImageToS3(blob, itemId);
      
      // Update the menu item in the database
      await fetchFromHasura(
        `mutation UpdateMenuItemImage($id: uuid!, $image_url: String!) {
          update_menu_by_pk(
            pk_columns: { id: $id }
            _set: { image_url: $image_url }
          ) {
            id
            image_url
          }
        }`,
        { id: itemId, image_url: s3Url }
      );
      
    } catch (error) {
      console.error("Error updating menu item image:", error);
      throw error;
    }
  };

  // Upload image to S3 (placeholder - implement based on your existing S3 logic)
  const uploadImageToS3 = async (blob: Blob, itemId: string): Promise<string> => {
    // This is a placeholder - you should implement this based on your existing S3 upload logic
    // For now, we'll return the original URL
    return URL.createObjectURL(blob);
  };

  const isAIGenerateEnabled =
    Array.isArray(bulkMenuItems) &&
    bulkMenuItems.length > 0 &&
    "image_prompt" in bulkMenuItems[0];

  useEffect(() => {
    // console.log("Menu Items:", bulkMenuItems);
  }, [bulkMenuItems]);

  // Load existing items when switching to add-images tab
  useEffect(() => {
    if (activeTab === 'add-images' && userData?.id) {
      loadExistingMenuItems();
    }
  }, [activeTab, userData?.id]);

  const handleDeleteAllMenu = async () => {
    if (!userData?.id) {
      toast.error("User data not found");
      return;
    }

    setIsDeletingMenu(true);
    try {
      const deleteAllMenuMutation = `
        mutation DeleteAllMenu($partnerId: uuid!) {
          update_menu(
            where: {
              partner_id: {_eq: $partnerId},
              deletion_status: {_neq: 1}
            },
            _set: { deletion_status: 1 }
          ) {
            affected_rows
          }
        }
      `;

      const result = await fetchFromHasura(deleteAllMenuMutation, {
        partnerId: userData.id,
      });

      if (result?.update_menu?.affected_rows > 0) {
        toast.success(
          `Successfully deleted ${result.update_menu.affected_rows} menu items`
        );
        await fetchMenu(userData.id, true);
      } else {
        toast.info("No menu items found to delete");
      }
    } catch (error) {
      console.error("Error deleting menu:", error);
      toast.error("Failed to delete menu items");
    } finally {
      setIsDeletingMenu(false);
      setShowDeleteDialog(false);
    }
  };

  // Handle edit existing item
  const handleEditExistingItem = (item: any) => {
    setEditingExistingItem({
      id: item.id,
      name: item.name,
      price: item.price,
      description: item.description || '',
      category: item.category,
      variants: item.variants || [],
      is_price_as_per_size: item.is_price_as_per_size || false,
    });
    setIsEditingExistingItem(true);
  };

  // Handle save edit for existing item
  const handleSaveExistingItemEdit = async () => {
    if (!editingExistingItem) return;
    
    try {
      toast.loading("Updating menu item...");
      
      await fetchFromHasura(
        `mutation UpdateMenuItem($id: uuid!, $updates: menu_set_input!) {
          update_menu_by_pk(
            pk_columns: { id: $id }
            _set: $updates
          ) {
            id
            name
            price
            description
            category {
              id
              name
            }
            variants
            is_price_as_per_size
          }
        }`,
        {
          id: editingExistingItem.id,
          updates: {
            name: editingExistingItem.name,
            price: editingExistingItem.price,
            description: editingExistingItem.description,
            is_price_as_per_size: editingExistingItem.is_price_as_per_size,
            variants: editingExistingItem.variants,
          }
        }
      );

      // Update category if changed
      if (editingExistingItem.category && editingExistingItem.category.id) {
        await fetchFromHasura(
          `mutation UpdateMenuItemCategory($id: uuid!, $category_id: uuid!) {
            update_menu_by_pk(
              pk_columns: { id: $id }
              _set: { category_id: $category_id }
            ) {
              id
            }
          }`,
          {
            id: editingExistingItem.id,
            category_id: editingExistingItem.category.id,
          }
        );
      }

      toast.dismiss();
      toast.success("Menu item updated successfully!");
      
      // Refresh the existing items list
      await loadExistingMenuItems();
      setIsEditingExistingItem(false);
      setEditingExistingItem(null);
      
    } catch (error) {
      toast.dismiss();
      console.error("Error updating menu item:", error);
      toast.error("Failed to update menu item");
    }
  };

  // Handle delete existing item
  const handleDeleteExistingItem = async (itemId: string) => {
    setIsDeletingExistingItem(itemId);
    try {
      toast.loading("Deleting menu item...");
      
      await fetchFromHasura(
        `mutation DeleteMenuItem($id: uuid!) {
          update_menu_by_pk(
            pk_columns: { id: $id }
            _set: { deletion_status: 1 }
          ) {
            id
          }
        }`,
        { id: itemId }
      );

      toast.dismiss();
      toast.success("Menu item deleted successfully!");
      
      // Refresh the existing items list
      await loadExistingMenuItems();
      
    } catch (error) {
      toast.dismiss();
      console.error("Error deleting menu item:", error);
      toast.error("Failed to delete menu item");
    } finally {
      setIsDeletingExistingItem(null);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="hover:bg-orange-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Bulk Menu Upload</h1>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'bulk-upload' | 'add-images')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
            <TabsTrigger value="add-images">Add Images</TabsTrigger>
          </TabsList>

          <TabsContent value="bulk-upload" className="space-y-6">
            {/* Existing bulk upload content */}
            <div className="grid grid-cols-1 mb-4">
              {/* Toggle between image and text input */}
              <div className="flex justify-center mb-4">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  <button
                    type="button"
                    onClick={() => setInputMode('image')}
                    className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                      inputMode === 'image'
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Upload Images
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                      inputMode === 'text'
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{`{ }`}</span>
                      <span>Paste JSON</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Image upload section */}
              {inputMode === 'image' && (
                <div className="space-y-3">
                  <label
                    htmlFor="menuImagesInput"
                    className="w-full cursor-pointer border-2 border-dashed rounded-lg h-40 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    {menuImagePreviews.length > 0 ? (
                      <div className="flex items-center gap-3 p-2 text-green-700">
                        <ImageIcon className="h-10 w-10" />
                        <span className="font-semibold">
                          {menuImagePreviews.length} image
                          {menuImagePreviews.length > 1 ? "s" : ""} selected
                        </span>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <UploadCloud className="mx-auto h-10 w-10" />
                        <span className="font-semibold mt-2 block">
                          Click to upload menu pages
                        </span>
                        <span className="text-xs">PNG, JPG, or WEBP</span>
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
                  <Button
                    onClick={() => handleExtractMenuItemsFromImage(0)}
                    disabled={isExtractingMenu || menuImageFiles.length === 0}
                    className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-base"
                  >
                    {isExtractingMenu ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Extracting Menu...
                      </>
                    ) : (
                      "Extract Menu from Images"
                    )}
                  </Button>
                </div>
              )}

              {/* Text input section */}
              {inputMode === 'text' && (
                <div className="w-full">
                  <KimiAiLink />
                  <Textarea
                    placeholder="Paste your JSON here...&#10;After extracting from an image, the generated JSON will appear here."
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    className="min-h-[200px] text-sm p-4 bg-white"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              {inputMode === 'text' && jsonInput && (
                <Button
                  className="text-[13px] w-full h-12"
                  onClick={() => handleJsonSubmit()}
                  disabled={!jsonInput.trim()}
                >
                  {bulkMenuItems.length > 0
                    ? "Reprocess & Update Items"
                    : "Convert JSON to Items"}
                </Button>
              )}

              {bulkMenuItems.length > 0 && (
                <>
                  <Button
                    className="text-[13px] w-full h-12"
                    variant="destructive"
                    onClick={handleClear}
                  >
                    Clear All
                  </Button>

                  <Button
                    className="text-[13px] w-full h-12"
                    onClick={() => handleUploadSelected(userData?.id as string)}
                    disabled={isBulkUploading}
                  >
                    {isBulkUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      `Upload ${
                        bulkMenuItems.filter((item) => item.isSelected).length
                      } Selected`
                    )}
                  </Button>
                </>
              )}
            </div>

            {bulkMenuItems.length > 0 && (
              <div className="mb-4 mt-5 flex items-center p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                  id="selectAll"
                  className="h-5 w-5"
                />
                <label
                  htmlFor="selectAll"
                  className="ml-3 text-base font-medium text-gray-800"
                >
                  Select All (
                  {bulkMenuItems.filter((item) => item.isSelected).length} /{" "}
                  {bulkMenuItems.length})
                </label>
              </div>
            )}

            {bulkMenuItems.length > 0 && (
              <div className="flex flex-wrap gap-2 py-4">
                <Button
                  onClick={handleGenerateImages}
                  className="bg-green-600 hover:bg-green-700 text-white h-12 text-sm sm:text-base flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    "Generate Full Images"
                  )}
                </Button>
                <Button
                  onClick={handlePartialImageGeneration}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white h-12 text-sm sm:text-base flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    "Generate Partial Images"
                  )}
                </Button>
                <Button
                  onClick={handleGenerateAIImages}
                  className="bg-purple-600 hover:bg-purple-700 text-white h-12 text-sm sm:text-base flex-1"
                  disabled={loading || !isAIGenerateEnabled}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    "Generate AI Images"
                  )}
                </Button>
              </div>
            )}

            {bulkMenuItems.length > 0 && !isEditModalOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {bulkMenuItems.map((item, index) => (
                  <MenuItemCard
                    key={index}
                    item={item}
                    index={index}
                    isUploading={isUploading[index]}
                    onSelect={() => handleSelectItem(index)}
                    onAddToMenu={() =>
                      handleAddToMenu(item, index, userData?.id as string)
                    }
                    onEdit={() => handleEdit(index, item)}
                    onDelete={() => handleDelete(index)}
                    onImageClick={(index, url) => handleImageClick(index, url)}
                    onCategoryChange={(category) =>
                      handleCategoryChange(index, {
                        name: category,
                        priority: 0,
                        id: item.category.id,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="add-images" className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Add Images to Existing Menu Items</h2>
              <p className="text-gray-600 mb-6">
                Select menu items that don't have images and add images to them without re-uploading the entire menu.
              </p>

              {isLoadingExistingItems ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  <span>Loading existing menu items...</span>
                </div>
              ) : existingMenuItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>All menu items already have images!</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedExistingItems.length === existingMenuItems.filter(item => !item.image_url || item.image_url === '').length && selectedExistingItems.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedExistingItems(existingMenuItems.filter(item => !item.image_url || item.image_url === '').map(item => item.id));
                          } else {
                            setSelectedExistingItems([]);
                          }
                        }}
                        id="selectAllExisting"
                        className="h-5 w-5"
                      />
                      <label htmlFor="selectAllExisting" className="text-base font-medium">
                        Select All ({selectedExistingItems.length} / {existingMenuItems.filter(item => !item.image_url || item.image_url === '').length} without images)
                      </label>
                    </div>
                  </div>

                  {selectedExistingItems.length > 0 && (
                    <div className="flex flex-wrap gap-2 py-4">
                      <Button
                        onClick={() => handleBulkImageGenerationForExisting('full')}
                        className="bg-green-600 hover:bg-green-700 text-white h-12 text-sm sm:text-base flex-1"
                        disabled={isUploadingImagesForExisting}
                      >
                        {isUploadingImagesForExisting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          "Generate Full Images"
                        )}
                      </Button>
                      {/* <Button
                        onClick={() => handleBulkImageGenerationForExisting('partial')}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white h-12 text-sm sm:text-base flex-1"
                        disabled={isUploadingImagesForExisting}
                      >
                        {isUploadingImagesForExisting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          "Generate Partial Images"
                        )}
                      </Button> */}
                      {/* <Button
                        onClick={() => handleBulkImageGenerationForExisting('ai')}
                        className="bg-purple-600 hover:bg-purple-700 text-white h-12 text-sm sm:text-base flex-1"
                        disabled={isUploadingImagesForExisting}
                      >
                        {isUploadingImagesForExisting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          "Generate AI Images"
                        )}
                      </Button> */}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {existingMenuItems.map((item) => (
                      <div
                        key={item.id}
                        className={`border rounded-lg overflow-hidden transition-colors flex flex-col h-full ${
                          selectedExistingItems.includes(item.id)
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Header with checkbox and basic info */}
                        <div className="flex items-start gap-3 p-4 pb-2">
                          <Checkbox
                            checked={selectedExistingItems.includes(item.id)}
                            onCheckedChange={() => handleExistingItemSelect(item.id)}
                            className="h-4 w-4 mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate flex items-center gap-2">
                              {item.name}
                              {item.image_url && item.image_url !== '' ? (
                                <span className="ml-2 w-2 h-2 rounded-full bg-green-500 inline-block" title="Image Added"></span>
                              ) : (
                                <span className="ml-2 w-2 h-2 rounded-full bg-yellow-400 inline-block" title="No Image"></span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-500">{item.category.name}</p>
                            <p className="text-sm font-medium text-gray-700">
                              {item.is_price_as_per_size ? (
                                <span className="text-xs">(Price as per size)</span>
                              ) : (
                                `₹${item.price}`
                              )}
                            </p>
                          </div>
                          {/* Thumbnail if image exists */}
                          {item.image_url && item.image_url !== '' && (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded border border-gray-200 ml-2"
                            />
                          )}
                        </div>

                        {/* Content area with description and variants */}
                        <div className="px-4 pb-2 flex-1">
                          {item.description && (
                            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                          )}
                          
                          {/* Display Variants if they exist */}
                          {item.variants && item.variants.length > 0 && (
                            <div className="mb-2">
                              <h4 className="text-xs font-semibold text-gray-700">Variants:</h4>
                              <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                {item.variants.slice(0, 2).map((variant: any, index: number) => (
                                  <li key={index} className="flex justify-between">
                                    <span>{variant.name}</span>
                                    <span className="font-medium">₹{variant.price}</span>
                                  </li>
                                ))}
                                {item.variants.length > 2 && (
                                  <li className="text-gray-500">+{item.variants.length - 2} more</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        {/* Action buttons - always at the bottom */}
                        <div className="flex justify-between items-center p-4 pt-2 border-t border-gray-100 mt-auto">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditExistingItem(item)}
                              className="h-8 px-2"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteExistingItem(item.id)}
                            disabled={isDeletingExistingItem === item.id}
                            className="h-8 px-2"
                          >
                            {isDeletingExistingItem === item.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {isEditModalOpen && editingItem && (
          <EditItemModal
            isOpen={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            editingItem={editingItem}
            onSave={handleSaveEdit}
            onEdit={(field, value) =>
              setEditingItem(
                editingItem
                  ? {
                      ...editingItem,
                      item: { ...editingItem.item, [field]: value },
                    }
                  : null
              )
            }
          />
        )}

        {/* Edit modal for existing items */}
        {isEditingExistingItem && editingExistingItem && (
          <EditItemModal
            isOpen={isEditingExistingItem}
            onOpenChange={setIsEditingExistingItem}
            editingItem={{
              item: editingExistingItem,
              index: 0,
            }}
            onSave={handleSaveExistingItemEdit}
            onEdit={(field, value) =>
              setEditingExistingItem(
                editingExistingItem
                  ? { ...editingExistingItem, [field]: value }
                  : null
              )
            }
          />
        )}

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Entire Menu</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete all menu items for this
                restaurant? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAllMenu}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Menu
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default BulkUploadPage;