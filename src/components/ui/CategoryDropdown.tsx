import React, { useEffect, useState, useMemo } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "./input";
import { Button } from "./button";
import { Label } from "./label";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { Category, formatDisplayName, useCategoryStore } from "@/store/categoryStore_hasura";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft } from "lucide-react";
import { useMenuStore } from "@/store/menuStore_hasura";
import { buildCategoryTree, type TreeCategory } from "@/lib/categoryTree";

// Helper function to extract unique categories from menu items - same as in CategoryManagementModal
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

interface CategoryDropdownProps {
  value: string;
  onChange: (value: string, category?: Category) => void;
}

export const CategoryDropdown = ({
  value,
  onChange,
}: CategoryDropdownProps) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newParentId, setNewParentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [uniqueCategories, setUniqueCategories] = useState<Category[]>([]);

  const { userData } = useAuthStore();
  const { fetchMenu } = useMenuStore();
  const { addCategory, fetchCategoryTree } = useCategoryStore();

  // Load the partner's categories.
  //
  // The category TREE is the primary source, with the item-derived list only as
  // a fallback. Deriving from menu items cannot see a category that holds no
  // items — and a group heading ("Mess") holds none by design, its children do —
  // so on its own it hides exactly the entries this picker needs to offer, and
  // gives no way to tell a subcategory from a top-level one.
  useEffect(() => {
    if (!userData || hasLoaded) return;

    const loadCategories = async () => {
      try {
        const [tree, menuItems] = await Promise.all([
          fetchCategoryTree(userData.id).catch(() => [] as Category[]),
          fetchMenu(userData.id),
        ]);
        const derived = extractCategoriesFromMenuItems(menuItems);

        // Merge by id, tree first — it is the only source carrying parent_id.
        // Anything the tree query missed still falls back to the derived list,
        // so this can never show FEWER categories than before.
        const byId = new Map<string, Category>();
        for (const c of tree) byId.set(c.id, c);
        for (const c of derived) if (!byId.has(c.id)) byId.set(c.id, c);

        setUniqueCategories([...byId.values()]);
        setHasLoaded(true);
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };

    loadCategories();
  }, [userData, fetchMenu, fetchCategoryTree, hasLoaded]);

  /**
   * Flatten the tree into the order the list renders, tagging each entry with
   * its depth so children can be indented under their parent.
   *
   * `value` stays the category NAME — all four call sites pass and store a name,
   * and changing that would be a breaking change for each of them.
   */
  const options = useMemo(() => {
    const roots = buildCategoryTree(uniqueCategories as TreeCategory[]);
    const byId = new Map(uniqueCategories.map((c) => [c.id, c]));
    const out: { category: Category; depth: number }[] = [];
    for (const root of roots) {
      const rc = byId.get(root.id);
      if (rc) out.push({ category: rc, depth: 0 });
      for (const child of root.children) {
        const cc = byId.get(child.id);
        if (cc) out.push({ category: cc, depth: 1 });
      }
    }
    return out;
  }, [uniqueCategories]);

  /** Top-level categories, offered as the parent when creating a new one. */
  const parentChoices = useMemo(
    () => options.filter((o) => o.depth === 0).map((o) => o.category),
    [options],
  );

  const handleSelectChange = (val: string) => {
    if (val === "new-cat") {
      setIsAddingNew(true);
    } else {
      const selectedCategory = uniqueCategories.find((c) => c.name === val);
      onChange(val, selectedCategory);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) return;

    setIsLoading(true);
    try {
      const createdCategory = await addCategory(
        newCategory.trim(),
        userData?.id,
        newParentId || null,
      );

      if (createdCategory) {
        onChange(formatDisplayName(createdCategory.name), createdCategory);
        toast.success(
          newParentId
            ? `Created inside ${formatDisplayName(
                parentChoices.find((p) => p.id === newParentId)?.name || "",
              )}`
            : "Category created successfully!",
        );

        // Add the new category to our local state immediately for better UX.
        // Carry parent_id through so it lands under its group straight away
        // rather than at top level until the next reload.
        setUniqueCategories((prev) => [
          ...prev,
          { ...createdCategory, parent_id: newParentId || null },
        ]);
      }

      setIsAddingNew(false);
      setNewCategory("");
      setNewParentId("");
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Error adding category");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setNewCategory("");
    setIsAddingNew(false);
  };

  if (isAddingNew) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-category">New Category Name</Label>
          <div className="flex items-center gap-2">
            <Input
              id="new-category"
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Enter new category name"
              autoFocus
              className="h-9 text-sm"
            />
          </div>
        </div>
        {parentChoices.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-category-parent">Group (optional)</Label>
            <select
              id="new-category-parent"
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm capitalize"
            >
              <option value="">— Top level —</option>
              {parentChoices.map((p) => (
                <option key={p.id} value={p.id}>
                  Inside {formatDisplayName(p.name)}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Put this category inside an existing one — e.g. &ldquo;Lunch
              Only&rdquo; inside &ldquo;Mess&rdquo;.
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1 h-9 px-4"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <Button
            type="button"
            disabled={!newCategory.trim() || isLoading}
            onClick={handleCreateCategory}
            className="h-9 px-4"
          >
            {isLoading ? "Creating..." : "Create Category"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={handleSelectChange}>
      <SelectTrigger className="capitalize h-9 text-sm text-foreground bg-background">
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent className="max-w-[95vw]">
        <ScrollArea className="h-64 md:h-48">
          <SelectItem
            value="new-cat"
            className="bg-green-100 dark:bg-stone-800 font-semibold cursor-pointer py-3 px-3 mb-1"
          >
            Create New Category
          </SelectItem>
          {options.map(({ category, depth }) => (
            <SelectItem
              className={`capitalize py-3 px-3 ${depth ? "pl-8" : ""}`}
              key={`${category.id}`}
              value={category.name}
            >
              {depth > 0 && (
                <span className="mr-1.5 text-muted-foreground" aria-hidden>
                  ↳
                </span>
              )}
              {formatDisplayName(category.name)}
            </SelectItem>
          ))}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
};

export default CategoryDropdown;