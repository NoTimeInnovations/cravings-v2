"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  FullModal,
  FullModalContent,
  FullModalHeader,
  FullModalTitle,
  FullModalBody,
} from "@/components/ui/full_modal";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Category, formatDisplayName } from "@/store/categoryStore_hasura";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvided,
} from "@hello-pangea/dnd";
import { useMenuStore, MenuItem } from "@/store/menuStore_hasura";
import {
  MoveVertical,
  X,
  Search,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// Type guard to check if item has a valid ID
function hasValidId(item: MenuItem): item is MenuItem & { id: string } {
  return typeof item.id === 'string' && item.id.length > 0;
}

interface ItemOrderingFormProps {
  categories: Category[];
  items: MenuItem[];
  onSubmit: (items: MenuItem[]) => Promise<void>;
  onCancel: () => void;
}

export function ItemOrderingForm({
  categories,
  items: initialItems,
  onSubmit,
  onCancel,
}: ItemOrderingFormProps) {
  const [localItems, setLocalItems] = useState<MenuItem[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialize items
  useEffect(() => {
    if (initialItems.length > 0) {
      // Only keep items with valid IDs
      const validItems = initialItems.filter(hasValidId);
      setLocalItems(validItems);
      setSearchTerm("");
      
      // Initialize with no categories expanded
      setExpandedCategories(new Set());
    }
  }, [initialItems, categories]);

  // Group items by category
  const itemsByCategory = localItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const categoryId = item.category.id;
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(item);
    return acc;
  }, {});

  // Sort items within each category by priority
  Object.keys(itemsByCategory).forEach(categoryId => {
    itemsByCategory[categoryId].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  });

  // Filter items and categories based on search term
  const filteredCategories = categories.filter(category => {
    // If there's a search term, check if category name matches or any item in this category matches
    if (searchTerm) {
      const categoryMatches = category.name.toLowerCase().includes(searchTerm.toLowerCase());
      const itemsInCategory = itemsByCategory[category.id] || [];
      const anyItemMatches = itemsInCategory.some(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.price.toString().includes(searchTerm)
      );
      return categoryMatches || anyItemMatches;
    }
    // If no search term, include all categories that have items
    return true;
  });

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const moveItem = (itemId: string, direction: 'up' | 'down') => {
    const itemIndex = localItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    const item = localItems[itemIndex];
    const categoryId = item.category.id;
    const itemsInCategory = itemsByCategory[categoryId] || [];
    const indexInCategory = itemsInCategory.findIndex(item => item.id === itemId);
    
    if (indexInCategory === -1) return;
    
    const newIndexInCategory = direction === 'up' 
      ? Math.max(0, indexInCategory - 1) 
      : Math.min(itemsInCategory.length - 1, indexInCategory + 1);
      
    if (newIndexInCategory === indexInCategory) return;
    
    // Create a new array with the item moved
    const newItemsInCategory = [...itemsInCategory];
    const [movedItem] = newItemsInCategory.splice(indexInCategory, 1);
    newItemsInCategory.splice(newIndexInCategory, 0, movedItem);
    
    // Update priorities for all items in the category
    const updatedItemsInCategory = newItemsInCategory.map((item, idx) => ({
      ...item,
      priority: idx + 1,
    }));
    
    // Update the local items state
    setLocalItems(prev => {
      const withoutCategory = prev.filter(item => item.category.id !== categoryId);
      return [...withoutCategory, ...updatedItemsInCategory];
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    // If the drag is between items in the same category
    if (source.droppableId === destination.droppableId) {
      const categoryId = source.droppableId;
      const itemsInCategory = [...(itemsByCategory[categoryId] || [])];
      
      // Move the item within the category
      const [movedItem] = itemsInCategory.splice(source.index, 1);
      itemsInCategory.splice(destination.index, 0, movedItem);
      
      // Update priorities
      const updatedItemsInCategory = itemsInCategory.map((item, idx) => ({
        ...item,
        priority: idx + 1,
      }));
      
      // Update the local items state
      setLocalItems(prev => {
        const withoutCategory = prev.filter(item => item.category.id !== categoryId);
        return [...withoutCategory, ...updatedItemsInCategory];
      });
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // Ensure all items have their priorities set based on their position in the category
      const updatedItems = Object.entries(itemsByCategory)
        .flatMap(([categoryId, items]) => {
          return items
            .filter(hasValidId)
            .map((item, index) => ({
              ...item,
              priority: index + 1,
            }));
        });

      await onSubmit(updatedItems);
      
      // Important: Set loading to false only after the promise is resolved
      setIsLoading(false);
    } catch (err) {
      // Make sure to set loading to false in case of errors too
      setIsLoading(false);
      console.error("Error updating item order:", err);
      toast.error("Failed to update item order");
    }
  };

  const handleReset = () => {
    // Blur any focused inputs to dismiss keyboard
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    setLocalItems(initialItems);
    toast("Changes discarded");
  };

  // Add this new component for better mobile drag handle
  const DragHandle = ({ provided }: { provided: DraggableProvided }) => {
    return (
      <div
        {...provided.dragHandleProps}
        className="flex items-center justify-center cursor-grab active:cursor-grabbing touch-manipulation"
        style={{
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        <MoveVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  };

  return (
    <div className="container px-0 sm:px-0 pb-6">
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-2xl font-bold">Manage Item Order</h2>
      </div>
      <p className="text-sm text-muted-foreground mt-1 mb-4 px-2">
        Expand categories and reorder items. Long-press to drag on mobile.
      </p>

      <div className="space-y-4 flex flex-col">
        <div className="flex gap-0 items-center sticky top-0 z-10 bg-background pt-0 pb-0 px-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1 h-7 w-7"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={() => setSearchTerm("")} className="shrink-0 ml-2">
            Clear
          </Button>
        </div>

        <div 
          ref={contentRef}
          className="border rounded-lg flex-1 flex flex-col overflow-auto touch-pan-y"
          style={{
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="w-full">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Table className="min-w-full">
                <TableHeader className="bg-gray-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[30px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[80px] text-right">Price</TableHead>
                    <TableHead className="w-[80px] text-center">
                      Move
                    </TableHead>
                    <TableHead className="w-[40px]">
                      Drag
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y">
                  {filteredCategories.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No categories found
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredCategories.map((category) => {
                    const isExpanded = expandedCategories.has(category.id);
                    const itemsInCategory = itemsByCategory[category.id] || [];
                    const hasItems = itemsInCategory.length > 0;
                    
                    // If search term is active, filter items in this category
                    const filteredItems = searchTerm 
                      ? itemsInCategory.filter(item => 
                          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.price.toString().includes(searchTerm)
                        )
                      : itemsInCategory;
                    
                    // Skip rendering this category if it has no matching items during search
                    if (searchTerm && filteredItems.length === 0) return null;
                    
                    return (
                      <React.Fragment key={category.id}>
                        {/* Category row */}
                        <TableRow 
                          key={`cat-${category.id}`} 
                          className="bg-gray-50 hover:bg-gray-100 font-medium cursor-pointer"
                          onClick={() => toggleCategoryExpansion(category.id)}
                        >
                          <TableCell className="w-[30px] pl-4">
                            {hasItems ? (
                              isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )
                            ) : (
                              <span className="h-4 w-4 block"></span>
                            )}
                          </TableCell>
                          <TableCell colSpan={4}>
                            <span className="font-bold capitalize">
                              {formatDisplayName(category.name)} ({filteredItems.length})
                            </span>
                          </TableCell>
                        </TableRow>
                        
                        {/* Render items if category is expanded */}
                        {isExpanded && (
                          <TableRow className="p-0 border-0">
                            <TableCell colSpan={5} className="p-0">
                              <Droppable droppableId={category.id}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="w-full"
                                  >
                                    {filteredItems
                                      .filter(hasValidId)
                                      .map((item, index) => {
                                        return (
                                          <Draggable
                                            key={item.id}
                                            draggableId={item.id}
                                            index={index}
                                          >
                                            {(provided, snapshot) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`flex items-center w-full p-2 my-1 ${
                                                  snapshot.isDragging
                                                    ? "bg-primary/10 shadow-md rounded-md border border-primary"
                                                    : "bg-background hover:bg-gray-50 rounded-md"
                                                }`}
                                                style={{
                                                  ...provided.draggableProps.style,
                                                  touchAction: 'pan-y',
                                                }}
                                              >
                                                <div className="w-[30px] pl-8">
                                                  {/* Indent to show hierarchy */}
                                                </div>
                                                <div className="font-medium flex-1">
                                                  {item.name}
                                                </div>
                                                <div className="w-[80px] text-right">
                                                  ₹{item.price}
                                                </div>
                                                {/* Mobile Actions */}
                                                <div className="w-[80px] flex justify-center gap-1">
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      moveItem(item.id, 'up');
                                                    }}
                                                    disabled={index === 0}
                                                    title="Move up"
                                                  >
                                                    <ArrowUp className="h-4 w-4" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      moveItem(item.id, 'down');
                                                    }}
                                                    disabled={index === filteredItems.length - 1}
                                                    title="Move down"
                                                  >
                                                    <ArrowDown className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                                {/* Drag Handle - visible on all devices */}
                                                <div className="w-[40px] flex items-center justify-center">
                                                  <DragHandle provided={provided} />
                                                </div>
                                              </div>
                                            )}
                                          </Draggable>
                                        );
                                      })}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </DragDropContext>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-6 px-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          variant="secondary"
          onClick={handleReset}
          disabled={isLoading}
        >
          Reset
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="relative"
        >
          {isLoading ? (
            <>
              <span className="opacity-0">Save Changes</span>
              <span className="absolute inset-0 flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}

interface ItemOrderingModalProps {
  categories: Category[];
  items: MenuItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ItemOrderingModal({
  categories,
  items,
  open,
  onOpenChange,
}: ItemOrderingModalProps) {
  const { updateItemsAsBatch, fetchMenu } = useMenuStore();

  const handleSubmit = async (updatedItems: MenuItem[]) => {
    // Filter out items without IDs and format for batch update
    const validItems = updatedItems.filter(hasValidId);
    const updates = validItems.map(item => ({
      id: item.id,
      priority: item.priority ?? 0
    }));
    
    try {
      await updateItemsAsBatch(updates);
      // Fetch updated menu data after successful update
      await fetchMenu();
      onOpenChange(false);
      toast.success("Item order updated successfully");
    } catch (error) {
      console.error("Failed to update item order:", error);
      toast.error("Failed to update item order");
    }
  };

  return (
    <FullModal open={open} onOpenChange={onOpenChange}>
      <FullModalContent className="h-[calc(100vh-56px)] mt-14 flex flex-col" showCloseButton={false}>
        <FullModalHeader>
          <FullModalTitle>Manage Item Order</FullModalTitle>
        </FullModalHeader>
        <FullModalBody>
          <ItemOrderingForm 
            categories={categories}
            items={items}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        </FullModalBody>
      </FullModalContent>
    </FullModal>
  );
} 