import React, { useState, useEffect, useCallback, useRef, createRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  FullModal,
  FullModalContent,
  FullModalHeader,
  FullModalTitle,
  FullModalBody,
  FullModalFooter,
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
import { Category, formatDisplayName, formatStorageName, useCategoryStore } from "@/store/categoryStore_hasura";
import { useAuthStore } from "@/store/authStore";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { useMenuStore } from "@/store/menuStore_hasura";
import {
  ChevronsUp,
  ChevronsDown,
  MoveVertical,
  X,
  Search,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Helper function to extract unique categories from menu items
const extractCategoriesFromMenuItems = (menuItems: any[]): Category[] => {
  // Use a Map with category NAME as the key to avoid duplicates
  const categoriesMap = new Map();
  
  menuItems.forEach(item => {
    if (item.category && item.category.name) {
      const categoryName = item.category.name.toLowerCase(); // Use lowercase for case-insensitive matching
      
      // Only add if this category name isn't already in the map
      if (!categoriesMap.has(categoryName)) {
        categoriesMap.set(categoryName, {
          id: item.category.id,
          name: item.category.name,
          priority: item.category.priority || 0,
          is_active: item.category.is_active !== false,
        });
      }
    }
  });
  
  const categories = Array.from(categoriesMap.values());
  
  // Sort by priority
  return categories.sort((a, b) => (a.priority || 0) - (b.priority || 0));
};

interface CategoryManagementFormProps {
  categories: Category[];
  onSubmit: (categories: Category[]) => Promise<void>;
  onCancel: () => void;
}

export function CategoryManagementForm({
  categories: initialCategories,
  onSubmit,
  onCancel,
}: CategoryManagementFormProps) {
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [inputRefs, setInputRefs] = useState<{[key: string]: React.RefObject<HTMLInputElement | null>}>({});
  const { deleteCategoryAndItems } = useMenuStore();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [categoriesInitialized, setCategoriesInitialized] = useState(false);

  // Get the authenticated user
  const user = useAuthStore(state => state.userData);
  
  // Initialize from passed-in categories props when they change
  useEffect(() => {
    if (initialCategories.length > 0 && !categoriesInitialized) {
      // Create refs for each category
      const refs: {[key: string]: React.RefObject<HTMLInputElement | null>} = {};
      initialCategories.forEach((cat: Category) => {
        refs[cat.id] = createRef<HTMLInputElement | null>();
      });
      
      // Format the category names for display
      const formattedCategories = initialCategories.map((cat: Category) => ({
        ...cat,
        name: formatDisplayName(cat.name),
        is_active: cat.is_active !== false // Ensure boolean value
      }));
      
      // Update state
      setInputRefs(refs);
      setLocalCategories(formattedCategories);
      setCategoriesInitialized(true);
    }
  }, [initialCategories, categoriesInitialized]);

  // Filter the categories based on search term
  const filteredCategories = useMemo(() => {
    return localCategories.filter((cat) =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [localCategories, searchTerm]);

  const moveToPosition = useCallback(
    (id: string, newIndex: number) => {
      const currentIndex = localCategories.findIndex((cat) => cat.id === id);
      if (
        currentIndex === -1 ||
        newIndex < 0 ||
        newIndex >= localCategories.length
      )
        return;

      const newCategories = [...localCategories];
      const [movedItem] = newCategories.splice(currentIndex, 1);
      newCategories.splice(newIndex, 0, movedItem);

      const updatedCategories = newCategories.map((cat, idx) => ({
        ...cat,
        priority: idx + 1,
      }));

      setLocalCategories(updatedCategories);
    },
    [localCategories]
  );

  const moveCategory = useCallback((id: string, direction: 'up' | 'down') => {
    const currentIndex = localCategories.findIndex((cat) => cat.id === id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' 
      ? Math.max(0, currentIndex - 1) 
      : Math.min(localCategories.length - 1, currentIndex + 1);
      
    if (newIndex !== currentIndex) {
      moveToPosition(id, newIndex);
    }
  }, [localCategories, moveToPosition]);

  const moveToTop = (id: string) => moveToPosition(id, 0);
  const moveToBottom = (id: string) =>
    moveToPosition(id, localCategories.length - 1);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    moveToPosition(result.draggableId, result.destination.index);
  };

  const handleNameChange = (id: string, newName: string) => {
    setLocalCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name: (newName) } : cat))
    );
  };

  const handleStatusChange = async (id: string, newIsActive: boolean) => {
    try {
      const currentCategories = [...localCategories];
      const categoryToUpdate = currentCategories.find(cat => cat.id === id);
      if (!categoryToUpdate) return;
      
      // Update local state optimistically
      const updatedCategories = currentCategories.map(cat => 
        cat.id === id ? { ...cat, is_active: newIsActive } : cat
      );
      setLocalCategories(updatedCategories);
      
      // Prepare the update object with all required fields
      const updateData = {
        ...categoryToUpdate,
        is_active: newIsActive,
        name: formatStorageName(categoryToUpdate.name), // Ensure name is in storage format
        priority: categoryToUpdate.priority || 0 // Ensure priority is always a number
      };
      
      // Update via menuStore's updateCategoriesAsBatch method to ensure consistency
      // We only update this single category instead of doing a full batch update
      const { updateCategoriesAsBatch } = useMenuStore.getState();
      await updateCategoriesAsBatch([updateData]);
      
      // Success notification
      toast.success(`Category ${newIsActive ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      toast.error('Failed to update category status');
      
      // On error, revert to the previous state
      if (user?.id) {
        try {
          // Find the original category in our local state
          const originalCategory = localCategories.find(cat => cat.id === id);
          if (originalCategory) {
            // Revert just this category
            const revertedCategories = localCategories.map(cat => 
              cat.id === id ? { ...cat, is_active: !newIsActive } : cat
            );
            setLocalCategories(revertedCategories);
          }
        } catch (refreshError) {
          // Error handling for reverting state
        }
      }
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    // Blur any focused inputs to dismiss keyboard
    if (document.activeElement instanceof HTMLInputElement) {
      document.activeElement.blur();
    }

    const updatedCategories = localCategories.map((cat: Category) => ({
      ...cat,
      name: formatStorageName(cat.name)
    }));

    try {
      await onSubmit(updatedCategories);
      toast.success("Categories updated successfully");
    } catch (err) {
      toast.error("Failed to update categories");
      throw err; // Re-throw to allow parent component to handle the error
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    // Blur any focused inputs to dismiss keyboard
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    setLocalCategories(initialCategories.map(cat => ({
      ...cat,
      name: formatDisplayName(cat.name)
    })));
    toast("Changes discarded");
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setKeyboardOpen(true);
    // Scroll to ensure the input is visible when focused
    setTimeout(() => {
      if (contentRef.current) {
        const rect = e.target.getBoundingClientRect();
        const containerRect = contentRef.current.getBoundingClientRect();
        
        if (rect.bottom > containerRect.bottom) {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 300);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      // Check if any category input or search input is focused
      const anyInputFocused = 
        document.activeElement === searchInputRef.current || 
        Object.values(inputRefs).some(ref => document.activeElement === ref.current);
      
      if (!anyInputFocused) {
        setKeyboardOpen(false);
      }
    }, 100);
  };

  // Effect to handle visual viewport changes (keyboard)
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        
        // If visual viewport is significantly smaller than window height, keyboard is probably open
        if (windowHeight - currentHeight > 150) {
          setKeyboardOpen(true);
        } else {
          setKeyboardOpen(false);
        }
      }
    };

    // Add the event listener
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    // Clean up
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return (
    <div className="container px-2 sm:px-0 pb-10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Manage Categories</h2>
      </div>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Drag categories or use arrows to reorder. Long-press to drag on mobile.
      </p>

      <div className="space-y-4 flex flex-col">
        <div className="flex gap-0 items-center sticky top-0 z-10 bg-background pt-0 pb-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
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
          <Button variant="outline" onClick={() => setSearchTerm("")} className="shrink-0">
            Clear
          </Button>
        </div>

        <div 
          ref={contentRef}
          className="border rounded-lg flex-1 overflow-hidden flex flex-col"
        >
          <div className="overflow-visible">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Table className="min-w-full">
                <TableHeader className="bg-gray-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                    <TableHead className="w-[80px] text-center">
                      Move
                    </TableHead>
                    <TableHead className="w-[40px] hidden sm:table-cell">
                      Drag
                    </TableHead>
                    <TableHead className="w-[40px] text-center">
                      Delete
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <Droppable droppableId="categories">
                  {(provided) => (
                    <TableBody
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="divide-y"
                    >
                      {filteredCategories.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No categories found
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredCategories.map((category, index) => {
                        const originalIndex = localCategories.findIndex(
                          (c) => c.id === category.id
                        );
                        return (
                          <Draggable
                            key={category.id}
                            draggableId={category.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <TableRow
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`${
                                  snapshot.isDragging
                                    ? "bg-primary/10 shadow-md"
                                    : "bg-background"
                                }`}
                              >
                                <TableCell>
                                  <Input
                                    ref={inputRefs[category.id]}
                                    value={(category.name)}
                                    onChange={(e) =>
                                      handleNameChange(
                                        category.id,
                                        e.target.value
                                      )
                                    }
                                    className="w-full"
                                    onFocus={handleInputFocus}
                                    onBlur={handleInputBlur}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id={`status-${category.id}`}
                                      checked={Boolean(category.is_active)}
                                      onCheckedChange={(checked) => {
                                        handleStatusChange(category.id, checked);
                                      }}
                                      className="data-[state=checked]:bg-green-500"
                                    />
                                    <Label htmlFor={`status-${category.id}`} className="text-sm">
                                      {category.is_active ? 'Active' : 'Inactive'}
                                    </Label>
                                  </div>
                                </TableCell>
                                {/* Desktop Actions */}
                                <TableCell className="hidden sm:table-cell">
                                  <div className="flex justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => moveToTop(category.id)}
                                      disabled={originalIndex === 0}
                                      title="Move to top"
                                    >
                                      <ChevronsUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => moveToBottom(category.id)}
                                      disabled={
                                        originalIndex ===
                                        localCategories.length - 1
                                      }
                                      title="Move to bottom"
                                    >
                                      <ChevronsDown className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                                {/* Up/Down Arrows - Visible on All Devices */}
                                <TableCell>
                                  <div className="flex justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => moveCategory(category.id, 'up')}
                                      disabled={originalIndex === 0}
                                      title="Move up"
                                    >
                                      <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => moveCategory(category.id, 'down')}
                                      disabled={
                                        originalIndex ===
                                        localCategories.length - 1
                                      }
                                      title="Move down"
                                    >
                                      <ArrowDown className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                                {/* Drag Handle - desktop only */}
                                <TableCell className="hidden sm:table-cell">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="flex items-center justify-center"
                                  >
                                    <MoveVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-800"
                                    onClick={async () => {
                                      if (
                                        confirm(
                                          `Delete "${category.name}" and all its items?`
                                        )
                                      ) {
                                        try {
                                          await deleteCategoryAndItems(
                                            category.id
                                          );
                                          // Remove from local state immediately
                                          setLocalCategories((prev) =>
                                            prev.filter(
                                              (cat) => cat.id !== category.id
                                            )
                                          );
                                          toast.success(
                                            `Deleted "${category.name}" successfully`
                                          );
                                        } catch (error) {
                                          toast.error(
                                            `Failed to delete "${category.name}"`
                                          );
                                        }
                                      }
                                    }}
                                    title="Delete category"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </TableBody>
                  )}
                </Droppable>
              </Table>
            </DragDropContext>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-6">
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
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

interface CategoryManagementModalProps {
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManagementModal({
  categories: initialCategories,
  open,
  onOpenChange,
}: CategoryManagementModalProps) {
  const { updateCategoriesAsBatch, fetchMenu } = useMenuStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const user = useAuthStore(state => state.userData);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Fetch categories from menu items when modal opens
  useEffect(() => {
    // Only load once when the modal is opened
    // Reset the loaded state when modal closes
    if (!open) {
      setHasLoaded(false);
      return;
    }
    
    // Skip if we've already loaded or if there's no user
    if (hasLoaded || !user?.id) return;
    
    const loadCategories = async () => {
      try {
        const menuItems = await fetchMenu(user.id, true); // Force refresh
        
        // Extract unique categories from menu items using the helper function
        const extractedCategories = extractCategoriesFromMenuItems(menuItems);
        
        setCategories(extractedCategories);
        setHasLoaded(true);
      } catch (error) {
        // If initialCategories is provided, ensure it's deduplicated
        if (initialCategories && initialCategories.length > 0) {
          // Use the same approach to deduplicate by name
          const uniqueMap = new Map();
          initialCategories.forEach(cat => {
            if (cat.name) {
              const catName = cat.name.toLowerCase();
              if (!uniqueMap.has(catName)) {
                uniqueMap.set(catName, cat);
              }
            }
          });
          
          const uniqueCategories = Array.from(uniqueMap.values());
          setCategories(uniqueCategories);
          setHasLoaded(true);
        }
      }
    };
    
    loadCategories();
  }, [open, user, hasLoaded]); // Remove initialCategories and fetchMenu from dependencies

  const handleSubmit = async (updatedCategories: Category[]) => {
    // Ensure we're only updating unique categories
    const uniqueUpdatedMap = new Map();
    updatedCategories.forEach(cat => {
      if (cat.name) {
        const catName = formatStorageName(cat.name).toLowerCase();
        if (!uniqueUpdatedMap.has(catName)) {
          uniqueUpdatedMap.set(catName, cat);
        }
      }
    });
    
    const uniqueUpdatedCategories = Array.from(uniqueUpdatedMap.values());
    
    await updateCategoriesAsBatch(uniqueUpdatedCategories);
    onOpenChange(false);
  };

  return (
    <FullModal open={open} onOpenChange={onOpenChange}>
      <FullModalContent className="h-[calc(100vh-56px)] mt-14 flex flex-col" showCloseButton={false}>
        <FullModalHeader>
          <FullModalTitle>Manage Categories</FullModalTitle>
        </FullModalHeader>
        <FullModalBody className="overflow-auto">
          <CategoryManagementForm 
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        </FullModalBody>
      </FullModalContent>
    </FullModal>
  );
}
