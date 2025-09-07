"use client";

import { useEffect, useState } from "react";
import {
  Pen,
  Plus,
  Search,
  Upload,
  Save,
  X,
  Menu,
  ListOrdered,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAdminOfferStore } from "@/store/useAdminOfferStore";
import { Partner, useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { AddMenuItemForm } from "../bulkMenuUpload/AddMenuItemModal";
import { EditMenuItemForm, EditMenuItemModal } from "./EditMenuItemModal";
import {
  CategoryManagementModal,
  CategoryManagementForm,
} from "./CategoryManagementModal";
import { ItemOrderingModal } from "./ItemOrderingModal";
import { MenuItem, useMenuStore } from "@/store/menuStore_hasura";
import { Switch } from "../ui/switch";
import { toast } from "sonner";
import { deleteFileFromS3 } from "@/app/actions/aws-s3";
import { useRouter, useSearchParams } from "next/navigation";
import { Accordion, AccordionContent, AccordionItem } from "../ui/accordion";
import { AccordionTrigger } from "@radix-ui/react-accordion";
import Img from "../Img";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { formatDisplayName } from "@/store/categoryStore_hasura";
import { ItemOrderingForm } from "./ItemOrderingModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


export function MenuTab() {
  const {
    items: menu,
    addItem,
    fetchMenu,
    updateItem,
    deleteItem,
    groupedItems,
    updateCategoriesAsBatch,
  } = useMenuStore();
  const [isCategoryEditing, setIsCategoryEditing] = useState(false);
  const { adminOffers, fetchAdminOffers } = useAdminOfferStore();
  const { userData } = useAuthStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchParams = useSearchParams();
  const [isMenuItemsFetching, setIsMenuItemsFetching] = useState(true);
  const [filteredGroupedItems, setFilteredGroupedItems] = useState(
    {} as Record<string, MenuItem[]>
  );
  const [editingItem, setEditingItem] = useState<{
    id: string;
    name: string;
    price: string;
    image: string;
    description: string;
    category: string;
    variants:
      | {
          name: string;
          price: number;
        }[]
      | [];
  } | null>(null);
  const [isInlineItemOrdering, setIsInlineItemOrdering] = useState(false);
  const [tempItems, setTempItems] = useState<Record<string, MenuItem[]>>({});
  const { updateItemsAsBatch } = useMenuStore();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    {}
  );
  const router = useRouter();

  useEffect(() => {
    if (userData?.id) {
      fetchAdminOffers(userData?.id);
      fetchMenu();
    }
  }, [userData, fetchAdminOffers, fetchMenu]);

  useEffect(() => {
    if (!isEditModalOpen) {
      setEditingItem(null);
    }
  }, [isEditModalOpen]);

  useEffect(() => {
    if (!groupedItems) return;

    const filtered: Record<string, MenuItem[]> = {};
    const newOpenCategories: Record<string, boolean> = {};

    Object.entries(groupedItems).forEach(([category, categoryItems]) => {
      const filteredCategoryItems = categoryItems.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      if (filteredCategoryItems.length > 0) {
        filtered[category] = filteredCategoryItems;
        // Preserve existing open state or default to false
        newOpenCategories[category] = openCategories[category] ?? false;
      }
    });

    setFilteredGroupedItems(filtered);
    setTempItems(filtered);
    setOpenCategories(newOpenCategories);
    setIsMenuItemsFetching(false);
  }, [groupedItems, searchQuery, searchParams]);

  const handleCopyMenu = async () => {
    try {
      if (!menu || menu.length === 0) {
        toast.error("No menu items to copy");
        return;
      }

      const menuForCopy = menu.map((item) => ({
        name: item.name,
        price: item.price,
        image_url: item.image_url,
        description: item.description,
        category: item.category.name,
        is_top: item.is_top,
        is_available: item.is_available,
        priority: item.priority,
        image_source: item.image_source || "local",
      }));

      const menuJson = JSON.stringify(menuForCopy, null, 2);

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(menuJson);
        toast.success(
          "Menu copied to clipboard! You can now paste it in the bulk upload page."
        );
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = menuJson;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand("copy");
          toast.success(
            "Menu copied to clipboard! You can now paste it in the bulk upload page."
          );
        } catch (err) {
          console.error("Fallback: Oops, unable to copy", err);
          toast.error(
            "Failed to copy menu to clipboard. Please try selecting and copying manually."
          );
        }

        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error("Error copying menu:", error);
      toast.error("Failed to copy menu to clipboard");
    }
  };

  const handleAddItem = (item: {
    name: string;
    price: string;
    image: string;
    description: string;
    category: string;
    variants?:
      | {
          name: string;
          price: number;
        }[]
      | [];
  }) => {
    addItem({
      name: item.name,
      price: parseFloat(item.price),
      image_url: item.image,
      description: item.description,
      category: {
        id: "temp-id-" + Math.random().toString(36).substring(2, 9),
        name: item.category,
        priority: 0,
        is_active: true,
      },
      image_source: "local",
      is_top: false,
      is_available: true,
      priority: 0,
      variants: item.variants,
    });
  };

  const handleEditItem = async (item: {
    id: string;
    name: string;
    price: string;
    image: string;
    description: string;
    category: string;
    variants?:
      | {
          name: string;
          price: number;
        }[]
      | [];
  }) => {
    const existingItem = menu.find((menuItem) => menuItem.id === item.id);

    if (!existingItem) {
      throw new Error("Item not found");
    }

    // Keep the category open during update
    setOpenCategories((prev) => ({
      ...prev,
      [typeof item.category === "object" && item.category !== null && (item.category as { name: string }).name !== undefined
        ? (item.category as { name: string }).name
        : item.category]: true,
    }));

    await updateItem(item.id, {
      name: item.name,
      price: parseFloat(item.price),
      image_url: item.image,
      description: item.description,
      category: {
        id: existingItem.category.id,
        name: item.category,
        priority: existingItem.category.priority,
        is_active: existingItem.category.is_active !== false ? true : false,
      },
      variants: item.variants,
    });

    // Refresh menu while preserving open state
    await fetchMenu();
  };

  const openEditModal = (item: {
    id: string;
    name: string;
    price: number;
    image: string;
    description: string;
    category: string | { name: string };
    variants?: {
      name: string;
      price: number;
    }[];
  }) => {
    // Ensure the category is open when editing an item
    setOpenCategories((prev) => ({
      ...prev,
      [typeof item.category === "object" && item.category !== null && "name" in item.category ? item.category.name : item.category]: true,
    }));

    setEditingItem({
      id: item.id,
      name: item.name,
      price: item.price.toString(),
      image: item.image,
      description: item.description || "",
      category:
        typeof item.category === "object" && item.category !== null && "name" in item.category
          ? item.category.name
          : item.category,
      variants: item.variants || [],
    });
    setIsEditModalOpen(true);
  };

  const getCategoryPriority = (category: string) => {
    const categoryItem = menu.find((item) => item.category.name === category);
    return categoryItem?.category.priority || 0;
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (source.droppableId === destination.droppableId) {
      const category = source.droppableId;
      const items = [...tempItems[category]];
      const [removed] = items.splice(source.index, 1);
      items.splice(destination.index, 0, removed);

      const updatedItems = items.map((item, index) => ({
        ...item,
        priority: index,
      }));

      setTempItems((prev) => ({
        ...prev,
        [category]: updatedItems,
      }));
    }
  };

  return (
    <div className="">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Menu Items</h2>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyMenu}
                  disabled={!menu || menu.length === 0}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {menu && menu.length > 0
                    ? "Copy menu for bulk upload"
                    : "No menu items to copy"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Link href="/admin/bulk-menu-upload">
            <Button variant="outline" size="icon">
              <Upload className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isAddModalOpen ? (
        <AddMenuItemForm
          onSubmit={(item) => {
            handleAddItem(item);
            setIsAddModalOpen(false);
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      ) : isEditModalOpen && editingItem ? (
        <EditMenuItemForm
          item={editingItem}
          onSubmit={async (item) => {
            try {
              await handleEditItem(item);
              setIsEditModalOpen(false);
            } catch (error) {
              console.error("Failed to update item:", error);
              toast.error("Failed to update item");
            }
          }}
          onCancel={() => setIsEditModalOpen(false)}
        />
      ) : isCategoryEditing ? (
        <CategoryManagementForm
          categories={Object.entries(groupedItems).map(([category, items]) => ({
            id: items[0].category.id,
            name: category,
            priority: items[0].category.priority || 0,
            is_active: items[0].category.is_active !== false ? true : false,
          }))}
          onSubmit={async (updatedCategories) => {
            try {
              await updateCategoriesAsBatch(updatedCategories);
              setIsCategoryEditing(false);
              fetchMenu();
            } catch (error) {
              console.error("Failed to update categories:", error);
              toast.error("Failed to update categories");
            }
          }}
          onCancel={() => setIsCategoryEditing(false)}
        />
      ) : isInlineItemOrdering ? (
        <div className="mb-6 border rounded-lg shadow-sm">
          <ItemOrderingForm
            categories={Object.entries(groupedItems).map(
              ([category, items]) => ({
                id: items[0].category.id,
                name: category,
                priority: items[0].category.priority || 0,
              })
            )}
            items={Object.values(groupedItems).flat()}
            onSubmit={async (updatedItems) => {
              try {
                const updates = updatedItems
                  .filter(
                    (item) => typeof item.id === "string" && item.id.length > 0
                  )
                  .map((item) => ({
                    id: item.id as string,
                    priority: item.priority ?? 0, // Ensure number
                  }));

                await updateItemsAsBatch(updates);
                setIsInlineItemOrdering(false);
                fetchMenu();
                toast.success("Item order updated successfully");
              } catch (error) {
                console.error("Failed to update item order:", error);
                toast.error("Failed to update item order");
              }
            }}
            onCancel={() => setIsInlineItemOrdering(false)}
          />
        </div>
      ) : (
        <>
          <div className="flex justify-end gap-2 mb-4 flex-wrap">
            <Button
              onClick={() => setIsInlineItemOrdering(true)}
              variant="outline"
              className="flex gap-2 text-xs sm:text-sm flex-1"
            >
              <ListOrdered className="h-4 w-4" />
              <span>Edit Item Order</span>
            </Button>
            <Button
              onClick={() => setIsCategoryEditing(true)}
              variant="outline"
              className="flex gap-2 text-xs sm:text-sm flex-1"
            >
              <Pen className="h-4 w-4" />
              <span>Category Update</span>
            </Button>
            <Button
              variant="outline"
              className="flex gap-2 text-xs sm:text-sm flex-1"
              onClick={() => router.push("/admin/item-availability-manage")}
            >
              <Check className="h-4 w-4" />
              <span>Availability Manage</span>
            </Button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isCategoryEditing && (
            <CategoryManagementModal
              open={isCategoryEditing}
              categories={Object.entries(groupedItems).map(
                ([category, items]) => ({
                  id: items[0].category.id,
                  name: category,
                  priority: items[0].category.priority,
                })
              )}
              onOpenChange={setIsCategoryEditing}
            />
          )}

          <>
            {Object.entries(tempItems).length > 0 ? (
              <DragDropContext onDragEnd={onDragEnd}>
                <Accordion
                  type="multiple"
                  className="grid gap-4"
                  value={Object.entries(openCategories)
                    .filter(([category, isOpen]) => isOpen)
                    .map(([category]) => category)}
                  onValueChange={(values: string[]) => {
                    const newOpenCategories = { ...openCategories };
                    Object.keys(newOpenCategories).forEach((category) => {
                      newOpenCategories[category] = values.includes(category);
                    });
                    setOpenCategories(newOpenCategories);
                  }}
                >
                  {Object.entries(tempItems)
                    .sort(([categoryA], [categoryB]) => {
                      const priorityA = getCategoryPriority(categoryA);
                      const priorityB = getCategoryPriority(categoryB);
                      return priorityA - priorityB;
                    })
                    .map(([category, items], index) => (
                      <AccordionItem value={category} key={category + index}>
                        <AccordionTrigger className="flex items-center gap-2 group max-w-fit">
                          <h1 className="text-xl lg:text-3xl font-bold my-2 lg:my-5 capitalize w-100 bg-transparent flex items-center gap-2">
                            <div className="left-marker">▶</div>{" "}
                            {formatDisplayName(category)}
                          </h1>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Droppable droppableId={category}>
                            {(provided) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                              >
                                {items
                                  .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
                                  .map((item, itemIndex) => (
                                    <Draggable
                                      key={item.id}
                                      draggableId={item.id as string}
                                      index={itemIndex}
                                    >
                                      {(provided) => (
                                        <Card
                                          {...provided.draggableProps}
                                          ref={provided.innerRef}
                                          className={`rounded-xl overflow-hidden grid`}
                                        >
                                          <CardHeader className="flex flex-row justify-between gap-4 relative">
                                            {!item.is_available && (
                                              <div className="absolute saturate-200 top-0 text-xl px-2 rounded-br-xl py-3 z-[40] left-0 bg-red-500 text-white font-bold">
                                                Unavailable
                                              </div>
                                            )}
                                            <div>
                                              {item.image_url.length > 0 && (
                                                <div className="relative w-32 h-32 overflow-hidden">
                                                  <Img
                                                    src={item.image_url}
                                                    alt={item.name}
                                                    className={`w-full h-full object-cover rounded-lg ${
                                                      item.is_available
                                                        ? ""
                                                        : " saturate-0"
                                                    }`}
                                                  />
                                                </div>
                                              )}
                                            </div>
                                            <CardTitle className="flex items-center justify-between w-full">
                                              {item.name}
                                            </CardTitle>
                                          </CardHeader>
                                          <CardContent className="relative">
                                            {/* Price Display - Shows default price or "From" price if variants exist */}
                                            <div className="flex items-baseline gap-2">
                                              {item.is_price_as_per_size ? (
                                                <div className="text-sm font-normal">
                                                  {" "}
                                                  {`(Price as per size)`}{" "}
                                                </div>
                                              ) : (
                                                <p className="text-2xl font-bold">
                                                  {(item.variants?.length ??
                                                    0) > 0 ? (
                                                    <>
                                                      <span className="text-xs">
                                                        From{" "}
                                                      </span>
                                                      {(userData as Partner)
                                                        ?.currency || "₹"}
                                                      {userData?.id ===
                                                      "767da2a8-746d-42b6-9539-528b6b96ae09"
                                                        ? Math.min(
                                                            ...(
                                                              item?.variants ??
                                                              []
                                                            ).map(
                                                              (v) => v.price
                                                            )
                                                          ).toFixed(3)
                                                        : Math.min(
                                                            ...(
                                                              item?.variants ??
                                                              []
                                                            ).map(
                                                              (v) => v.price
                                                            )
                                                          )}
                                                    </>
                                                  ) : userData?.id ===
                                                    "767da2a8-746d-42b6-9539-528b6b96ae09" ? (
                                                    <>
                                                      {(userData as Partner)
                                                        ?.currency || "₹"}
                                                      {item.price.toFixed(3)}
                                                    </>
                                                  ) : (
                                                    <>
                                                      {(userData as Partner)
                                                        ?.currency || "₹"}
                                                      {item.price}
                                                    </>
                                                  )}
                                                </p>
                                              )}

                                              {(item.variants?.length ?? 0) >
                                                0 && (
                                                <span className="text-sm text-gray-500">
                                                  (
                                                  {(item.variants ?? []).length}{" "}
                                                  options)
                                                </span>
                                              )}
                                            </div>

                                            {/* Variants Display */}
                                            {(item.variants?.length ?? 0) >
                                              0 && (
                                              <div className="mt-2 space-y-1 bg-gray-50 p-2 rounded-lg">
                                                <p className="text-sm font-medium text-gray-600">
                                                  Options:
                                                </p>
                                                <div className="max-h-32 overflow-y-auto pr-2">
                                                  {(item.variants ?? []).map(
                                                    (variant, index) => (
                                                      <div
                                                        key={index}
                                                        className="flex justify-between text-sm py-1 border-b border-gray-100"
                                                      >
                                                        <span className="text-gray-700">
                                                          {variant.name}
                                                        </span>
                                                        <span className="font-medium">
                                                          {(userData as Partner)
                                                            ?.currency || "₹"}
                                                          {userData?.id ===
                                                          "767da2a8-746d-42b6-9539-528b6b96ae09"
                                                            ? variant.price.toFixed(
                                                                3
                                                              )
                                                            : variant.price}
                                                        </span>
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                            )}

                                            {item.description && (
                                              <p className="text-gray-600 mt-4">
                                                Description : {item.description}
                                              </p>
                                            )}

                                            {/* Toggles */}
                                            <div className="flex items-center mt-2">
                                              <label className="mr-2">
                                                Mark as Popular:
                                              </label>
                                              <Switch
                                                checked={item.is_top}
                                                onCheckedChange={async () => {
                                                  try {
                                                    if (item.is_top) {
                                                      await updateItem(
                                                        item.id as string,
                                                        { is_top: false }
                                                      );
                                                    } else {
                                                      await updateItem(
                                                        item.id as string,
                                                        { is_top: true }
                                                      );
                                                    }
                                                  } catch (error) {
                                                    toast.error(
                                                      "Failed to update item status"
                                                    );
                                                    console.error(error);
                                                  }
                                                }}
                                              />
                                            </div>
                                            <div className="flex items-center mt-3">
                                              <label className="mr-2">
                                                Is Available:
                                              </label>
                                              <Switch
                                                checked={item.is_available}
                                                onCheckedChange={async () => {
                                                  try {
                                                    await updateItem(
                                                      item.id as string,
                                                      {
                                                        is_available:
                                                          !item.is_available,
                                                      }
                                                    );
                                                  } catch (error) {
                                                    toast.error(
                                                      "Failed to mark item as " +
                                                        (item.is_available
                                                          ? "Unavailable"
                                                          : "Available")
                                                    );
                                                    console.error(error);
                                                  }
                                                }}
                                              />
                                            </div>

                                            <div className="flex items-center mt-3">
                                              <label className="mr-2">
                                                Is Price as per Size:
                                              </label>
                                              <Switch
                                                checked={
                                                  item.is_price_as_per_size ===
                                                  true
                                                }
                                                onCheckedChange={async () => {
                                                  console.log(
                                                    item.is_price_as_per_size
                                                  );

                                                  try {
                                                    await updateItem(
                                                      item.id as string,
                                                      {
                                                        is_price_as_per_size:
                                                          !item.is_price_as_per_size,
                                                      }
                                                    );
                                                  } catch (error) {
                                                    toast.error(
                                                      "Failed to mark item as " +
                                                        (item.is_price_as_per_size
                                                          ? "Price Fixed"
                                                          : "Price as per Size")
                                                    );
                                                    console.error(error);
                                                  }
                                                }}
                                              />
                                            </div>
                                          </CardContent>
                                          <CardFooter className="flex justify-end space-x-2">
                                            <Button
                                              variant="outline"
                                              onClick={() =>
                                                openEditModal({
                                                  id: item.id as string,
                                                  name: item.name,
                                                  price: item.price,
                                                  image: item.image_url,
                                                  description:
                                                    item.description || "",
                                                  category: item.category.name,
                                                  variants: item.variants,
                                                })
                                              }
                                            >
                                              Edit
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              onClick={async (e) => {
                                                e.currentTarget.disabled = true;
                                                e.currentTarget.innerText =
                                                  "Deleting...";
                                                const isOfferActive =
                                                  adminOffers.some(
                                                    (offer) =>
                                                      offer.menuItemId ===
                                                      item.id
                                                  );
                                                if (isOfferActive) {
                                                  alert(
                                                    `Cannot delete the menu item "${item.name}" because it has an active offer. Please delete the offer first.`
                                                  );
                                                  return;
                                                }
                                                await deleteItem(
                                                  item.id as string
                                                );
                                                if (item.image_url)
                                                  await deleteFileFromS3(
                                                    item.image_url
                                                  );
                                              }}
                                            >
                                              Delete
                                            </Button>
                                          </CardFooter>
                                        </Card>
                                      )}
                                    </Draggable>
                                  ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>
              </DragDropContext>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No menu items found</p>
              </div>
            )}
          </>
        </>
      )}
    </div>
  );
}
