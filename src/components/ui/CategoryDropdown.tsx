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
          parent_id: item.category.parent_id ?? null,
        });
      }
    }
  });

  const categories = Array.from(categoriesMap.values());

  // Sort by priority
  return categories.sort((a, b) => (a.priority || 0) - (b.priority || 0));
};

const NONE = "__none__";
const NEW_CAT = "new-cat";
const NEW_SUB = "new-sub";

interface CategoryDropdownProps {
  value: string;
  onChange: (value: string, category?: Category) => void;
}

/**
 * Category + Subcategory pickers for a menu item.
 *
 * Menus are two levels deep: a group like "Mess" holds "3 Times", "Lunch Only",
 * and the item is filed on the CHILD. Rather than make callers understand that,
 * this component keeps the original single-value contract — `value` is a
 * category NAME and `onChange` reports the category the item belongs to — and
 * splits the choice across two selects internally. All four call sites (both
 * admin-v2 item screens, the legacy edit modal, bulk upload) pass and store a
 * name, so the contract has to stay exactly that.
 *
 * Filing an item directly on a group is allowed: leave Subcategory on "None".
 */
export const CategoryDropdown = ({
  value,
  onChange,
}: CategoryDropdownProps) => {
  const [addingKind, setAddingKind] = useState<null | "category" | "subcategory">(null);
  const [newCategory, setNewCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  /** The top-level category showing in the first select. */
  const [parentId, setParentId] = useState<string | null>(null);

  const { userData } = useAuthStore();
  const { fetchMenu } = useMenuStore();
  const { addCategory, fetchCategoryTree } = useCategoryStore();

  // The category TREE is the primary source; the item-derived list is only a
  // fallback. Deriving from menu items cannot see a category holding no items —
  // and a group holds none by design, its children do — so on its own it hides
  // exactly the entries this picker must offer.
  useEffect(() => {
    if (!userData || hasLoaded) return;
    (async () => {
      try {
        const [tree, menuItems] = await Promise.all([
          fetchCategoryTree(userData.id).catch(() => [] as Category[]),
          fetchMenu(userData.id),
        ]);
        const derived = extractCategoriesFromMenuItems(menuItems);
        // Merge by id, tree first — it is the only source carrying parent_id.
        // The fallback means this can never offer FEWER categories than before.
        const byId = new Map<string, Category>();
        for (const c of tree) byId.set(c.id, c);
        for (const c of derived) if (!byId.has(c.id)) byId.set(c.id, c);
        setCategories([...byId.values()]);
        setHasLoaded(true);
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    })();
  }, [userData, fetchMenu, fetchCategoryTree, hasLoaded]);

  const selected = useMemo(
    () => categories.find((c) => c.name === value) || null,
    [categories, value],
  );

  // Mirror the incoming value into the parent select: an item filed on a child
  // must show its group above, not blank.
  useEffect(() => {
    if (!selected) return;
    setParentId(selected.parent_id ? selected.parent_id : selected.id);
  }, [selected]);

  const topLevel = useMemo(
    () =>
      categories
        .filter((c) => !c.parent_id)
        .sort((a, b) => (a.priority || 0) - (b.priority || 0)),
    [categories],
  );
  const subcategories = useMemo(
    () =>
      categories
        .filter((c) => c.parent_id && c.parent_id === parentId)
        .sort((a, b) => (a.priority || 0) - (b.priority || 0)),
    [categories, parentId],
  );

  const parentValue = parentId
    ? topLevel.find((c) => c.id === parentId)?.name ?? ""
    : "";
  // "None" whenever the item sits on the group itself rather than a child.
  const subValue = selected?.parent_id ? selected.name : NONE;

  const handleParentChange = (val: string) => {
    if (val === NEW_CAT) {
      setAddingKind("category");
      return;
    }
    const cat = topLevel.find((c) => c.name === val);
    if (!cat) return;
    setParentId(cat.id);
    // Land on the group until a subcategory is picked, so the item always has a
    // category — never a moment where the form holds a half-made selection.
    onChange(cat.name, cat);
  };

  const handleSubChange = (val: string) => {
    if (val === NEW_SUB) {
      setAddingKind("subcategory");
      return;
    }
    if (val === NONE) {
      const parent = topLevel.find((c) => c.id === parentId);
      if (parent) onChange(parent.name, parent);
      return;
    }
    const cat = subcategories.find((c) => c.name === val);
    if (cat) onChange(cat.name, cat);
  };

  const handleCreate = async () => {
    const name = newCategory.trim();
    if (!name) return;
    const asSub = addingKind === "subcategory";
    if (asSub && !parentId) {
      toast.error("Pick a category first");
      return;
    }
    setIsLoading(true);
    try {
      const created = await addCategory(name, userData?.id, asSub ? parentId : null);
      if (created) {
        const withParent: Category = {
          ...created,
          parent_id: asSub ? parentId : null,
        };
        // Seed local state so the new row is immediately pickable, and under its
        // group rather than at top level until the next reload.
        setCategories((prev) => [...prev, withParent]);
        if (!asSub) setParentId(withParent.id);
        onChange(formatDisplayName(created.name), withParent);
        toast.success(asSub ? "Subcategory created" : "Category created");
      }
      setAddingKind(null);
      setNewCategory("");
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Error adding category");
    } finally {
      setIsLoading(false);
    }
  };

  if (addingKind) {
    const parentName = topLevel.find((c) => c.id === parentId)?.name;
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-category">
            {addingKind === "subcategory"
              ? `New Subcategory${parentName ? ` in ${formatDisplayName(parentName)}` : ""}`
              : "New Category Name"}
          </Label>
          <Input
            id="new-category"
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder={
              addingKind === "subcategory"
                ? "e.g. Lunch Only"
                : "Enter new category name"
            }
            autoFocus
            className="h-9 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setNewCategory("");
              setAddingKind(null);
            }}
            className="flex items-center gap-1 h-9 px-4"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <Button
            type="button"
            disabled={!newCategory.trim() || isLoading}
            onClick={handleCreate}
            className="h-9 px-4"
          >
            {isLoading ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select value={parentValue} onValueChange={handleParentChange}>
        <SelectTrigger className="capitalize h-9 text-sm text-foreground bg-background">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent className="max-w-[95vw]">
          <ScrollArea className="h-64 md:h-48">
            <SelectItem
              value={NEW_CAT}
              className="bg-green-100 dark:bg-stone-800 font-semibold cursor-pointer py-3 px-3 mb-1"
            >
              Create New Category
            </SelectItem>
            {topLevel.map((category) => (
              <SelectItem
                className="capitalize py-3 px-3"
                key={category.id}
                value={category.name}
              >
                {formatDisplayName(category.name)}
              </SelectItem>
            ))}
          </ScrollArea>
        </SelectContent>
      </Select>

      {/* Only meaningful once a category is chosen. Hidden entirely for a
          partner with no groups, so nothing changes for them. */}
      {parentId && (subcategories.length > 0 || topLevel.length > 0) && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Subcategory (optional)</Label>
          <Select value={subValue} onValueChange={handleSubChange}>
            <SelectTrigger className="capitalize h-9 text-sm text-foreground bg-background">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent className="max-w-[95vw]">
              <ScrollArea className={subcategories.length > 4 ? "h-64 md:h-48" : ""}>
                <SelectItem
                  value={NEW_SUB}
                  className="bg-green-100 dark:bg-stone-800 font-semibold cursor-pointer py-3 px-3 mb-1"
                >
                  Create New Subcategory
                </SelectItem>
                <SelectItem value={NONE} className="py-3 px-3">
                  None
                </SelectItem>
                {subcategories.map((category) => (
                  <SelectItem
                    className="capitalize py-3 px-3"
                    key={category.id}
                    value={category.name}
                  >
                    {formatDisplayName(category.name)}
                  </SelectItem>
                ))}
              </ScrollArea>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default CategoryDropdown;
