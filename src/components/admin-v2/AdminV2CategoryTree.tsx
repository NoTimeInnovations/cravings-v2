"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CornerDownRight, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import {
  useCategoryStore,
  formatDisplayName,
  type Category,
} from "@/store/categoryStore_hasura";
import {
  buildCategoryTree,
  canSetParent,
  type CategoryNode,
  type TreeCategory,
} from "@/lib/categoryTree";

/**
 * "Organise categories" — group categories under a parent, two levels deep.
 *
 * Lives on its own panel rather than inside the menu list because that list is
 * built by grouping ITEMS, so a category with nothing in it is invisible there.
 * A parent normally holds no items of its own ("Mess" is just a heading over
 * "Lunch Only", "3 Times", …), so the one screen where you need to create and
 * see it is the one screen that could never show it.
 *
 * Reads the full category list via `fetchCategoryTree` for the same reason.
 */
export default function AdminV2CategoryTree({ onBack }: { onBack: () => void }) {
  const { userData } = useAuthStore();
  const { fetchCategoryTree, setCategoryParent, addCategory } = useCategoryStore();

  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newParent, setNewParent] = useState("");
  const [creating, setCreating] = useState(false);

  const partnerId = userData?.id;

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      setCats(await fetchCategoryTree(partnerId));
    } finally {
      setLoading(false);
    }
  }, [partnerId, fetchCategoryTree]);

  useEffect(() => {
    void load();
  }, [load]);

  const tree: CategoryNode[] = useMemo(
    () => buildCategoryTree(cats as TreeCategory[]),
    [cats],
  );

  /** Categories that may be chosen as a parent: top-level, and not this one. */
  const parentOptions = useCallback(
    (id: string) =>
      cats.filter((c) => c.id !== id && !c.parent_id && canSetParent(id, c.id, cats as TreeCategory[]).ok),
    [cats],
  );

  const move = async (categoryId: string, parentId: string | null) => {
    const check = canSetParent(categoryId, parentId, cats as TreeCategory[]);
    if (!check.ok) {
      toast.error(check.reason);
      return;
    }
    setSavingId(categoryId);
    // Optimistic: the row re-renders under its new heading immediately, and we
    // reload from the server afterwards so a rejected write can't stick.
    setCats((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, parent_id: parentId } : c)),
    );
    try {
      await setCategoryParent(categoryId, parentId);
      toast.success(parentId ? "Moved into the group" : "Moved to top level");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't move that category");
      await load();
    } finally {
      setSavingId(null);
    }
  };

  const createParent = async () => {
    const name = newParent.trim();
    if (!name || !partnerId) return;
    setCreating(true);
    try {
      await addCategory(name, partnerId, null);
      setNewParent("");
      await load();
      toast.success(`"${name}" created — now move categories into it`);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't create that category");
    } finally {
      setCreating(false);
    }
  };

  const row = (c: Category, isChild: boolean) => {
    const opts = parentOptions(c.id);
    const hasChildren = cats.some((x) => x.parent_id === c.id);
    return (
      <div
        key={c.id}
        className={`flex items-center gap-2 py-2.5 ${isChild ? "pl-7" : ""}`}
      >
        {isChild && <CornerDownRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <span className="min-w-0 flex-1 truncate text-sm font-medium capitalize">
          {formatDisplayName(c.name)}
        </span>
        {savingId === c.id ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : hasChildren ? (
          // A category that already has children can't also become one — say so
          // rather than offering a dropdown whose every option would be refused.
          <span className="shrink-0 text-xs text-muted-foreground">
            group of {cats.filter((x) => x.parent_id === c.id).length}
          </span>
        ) : (
          <select
            className="h-8 shrink-0 rounded-md border bg-background px-2 text-xs"
            value={c.parent_id || ""}
            onChange={(e) => move(c.id, e.target.value || null)}
            aria-label={`Group for ${formatDisplayName(c.name)}`}
          >
            <option value="">— Top level —</option>
            {opts.map((p) => (
              <option key={p.id} value={p.id}>
                Inside {formatDisplayName(p.name)}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Organise categories</h2>
          <p className="text-xs text-muted-foreground">
            Group related categories under one heading. Customers see the group
            in the menu bar, and its categories as headings inside it.
          </p>
        </div>
      </div>

      <div className="mb-5 flex gap-2">
        <Input
          value={newParent}
          onChange={(e) => setNewParent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void createParent();
          }}
          placeholder="New group name — e.g. Mess"
          className="h-9"
        />
        <Button onClick={createParent} disabled={!newParent.trim() || creating} className="h-9">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span className="ml-1">Add group</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading categories…
        </div>
      ) : !cats.length ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No categories yet. Add menu items first.
        </p>
      ) : (
        <div className="divide-y rounded-lg border px-3">
          {tree.map((node) => {
            const cat = cats.find((c) => c.id === node.id);
            if (!cat) return null;
            return (
              <div key={node.id} className="py-1">
                {row(cat, false)}
                {node.children.map((child) => {
                  const cc = cats.find((c) => c.id === child.id);
                  return cc ? row(cc, true) : null;
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
