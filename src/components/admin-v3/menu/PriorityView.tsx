"use client";

import * as React from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from "@hello-pangea/dnd";
import { ArrowDown, ArrowUp, ChevronRight, GripVertical, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { confirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import {
  Category,
  formatDisplayName,
  useCategoryStore,
} from "@/store/categoryStore_hasura";
import { MenuItem, useMenuStore } from "@/store/menuStore_hasura";
import { AdminV3Button } from "../ui/primitives";
import {
  ChipButton,
  CountPill,
  FormCard,
  GhostIconButton,
  SubViewHeader,
  V3Input,
  V3Segmented,
} from "./formKit";

type Mode = "drag" | "numbers";

/** One row in either pane — categories and items reorder identically. */
type Row = { id: string; name: string; meta: string; priority: number };

export function PriorityView({ onBack }: { onBack: () => void }) {
  const { categories, fetchCategories } = useCategoryStore();
  const { items, fetchMenu, updateItemsAsBatch, updateCategoriesAsBatch } =
    useMenuStore();
  const { userData } = useAuthStore();

  const [mode, setMode] = React.useState<Mode>("drag");
  const [localCategories, setLocalCategories] = React.useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] =
    React.useState<Category | null>(null);
  const [localItems, setLocalItems] = React.useState<MenuItem[]>([]);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (userData?.id) {
      fetchCategories(userData.id);
      fetchMenu();
    }
  }, [userData?.id, fetchCategories, fetchMenu]);

  const resetCategories = React.useCallback(() => {
    const sorted = [...categories].sort(
      (a, b) => (a.priority || 0) - (b.priority || 0),
    );
    setLocalCategories(
      sorted.map((c, i) => ({ ...c, priority: c.priority || i + 1 })),
    );
  }, [categories]);

  const resetItems = React.useCallback(() => {
    if (!selectedCategory) return;
    const sorted = items
      .filter((i) => i.category.id === selectedCategory.id)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
    setLocalItems(
      sorted.map((it, i) => ({ ...it, priority: it.priority || i + 1 })),
    );
  }, [items, selectedCategory]);

  React.useEffect(() => {
    if (categories.length > 0) resetCategories();
  }, [categories, resetCategories]);

  React.useEffect(() => {
    if (selectedCategory) resetItems();
  }, [selectedCategory, resetItems]);

  const inItems = !!selectedCategory;

  const rows: Row[] = inItems
    ? localItems.map((it) => ({
        id: it.id!,
        name: it.name,
        meta:
          it.variants && it.variants.length > 0
            ? `${it.variants.length} variants`
            : it.is_available === false
              ? "Unavailable"
              : "Available",
        priority: it.priority || 0,
      }))
    : localCategories.map((c) => ({
        id: c.id,
        name: formatDisplayName(c.name),
        meta: `${items.filter((i) => i.category.id === c.id).length} items`,
        priority: c.priority || 0,
      }));

  const applyOrder = (next: Row[]) => {
    if (inItems) {
      const byId = new Map(localItems.map((i) => [i.id, i] as const));
      setLocalItems(
        next
          .map((r, idx) => {
            const it = byId.get(r.id);
            return it ? { ...it, priority: idx + 1 } : null;
          })
          .filter(Boolean) as MenuItem[],
      );
    } else {
      const byId = new Map(localCategories.map((c) => [c.id, c] as const));
      setLocalCategories(
        next
          .map((r, idx) => {
            const c = byId.get(r.id);
            return c ? { ...c, priority: idx + 1 } : null;
          })
          .filter(Boolean) as Category[],
      );
    }
    setHasChanges(true);
  };

  const move = (index: number, delta: number) => {
    const next = [...rows];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    applyOrder(next);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const next = [...rows];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    applyOrder(next);
  };

  const setPriorityNumber = (id: string, raw: string) => {
    const n = raw === "" ? 0 : parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    if (inItems) {
      setLocalItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, priority: n } : it)),
      );
    } else {
      setLocalCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, priority: n } : c)),
      );
    }
    setHasChanges(true);
  };

  /** Numbers mode: re-sort the list from the typed values on blur / Enter. */
  const resortByNumber = () => {
    if (inItems) {
      setLocalItems((prev) =>
        [...prev].sort((a, b) => (a.priority || 0) - (b.priority || 0)),
      );
    } else {
      setLocalCategories((prev) =>
        [...prev].sort((a, b) => (a.priority || 0) - (b.priority || 0)),
      );
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (inItems) {
        await updateItemsAsBatch(
          localItems.map((it) => ({ id: it.id!, priority: it.priority! })),
        );
      } else {
        await updateCategoriesAsBatch(localCategories);
        useCategoryStore.setState({ categories: localCategories });
      }
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save priorities:", error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const guardedBack = async () => {
    if (
      hasChanges &&
      !(await confirmDialog({
        title: "Discard unsaved changes?",
        description:
          "You have unsaved changes. They will be lost if you leave this screen.",
        confirmText: "Discard",
        destructive: true,
      }))
    )
      return;
    setHasChanges(false);
    if (selectedCategory) setSelectedCategory(null);
    else onBack();
  };

  const subtitle = inItems
    ? `Reordering items in ${formatDisplayName(selectedCategory!.name)}`
    : mode === "drag"
      ? "Drag a row, or use the arrows. Pick a category to reorder its items."
      : "Type a priority number — lower numbers show first.";

  return (
    <div className="flex flex-col">
      <SubViewHeader
        title="Change Priority"
        subtitle={subtitle}
        onBack={guardedBack}
      >
        <V3Segmented<Mode>
          className="w-[210px] shrink-0"
          value={mode}
          onChange={setMode}
          options={[
            { value: "drag", label: "Drag & arrows" },
            { value: "numbers", label: "Numbers" },
          ]}
        />
        <ChipButton
          className="h-9"
          onClick={() => {
            if (inItems) resetItems();
            else resetCategories();
            setHasChanges(false);
          }}
        >
          <RotateCcw size={14} strokeWidth={1.8} />
          Reset
        </ChipButton>
        <AdminV3Button
          variant="primary"
          className="h-9"
          disabled={saving || !hasChanges}
          onClick={handleSave}
        >
          <Save size={14} strokeWidth={2} />
          {saving ? "Saving…" : "Save order"}
        </AdminV3Button>
      </SubViewHeader>

      <div className="flex flex-wrap items-start gap-4 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        <FormCard className="min-w-0 flex-[1_1_340px] overflow-hidden">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-800">
            <div className="min-w-0 flex-1">
              <div
                translate={inItems ? "no" : undefined}
                className={cn(
                  "truncate text-[14.5px] font-semibold leading-tight tracking-[-0.01em] text-zinc-950 dark:text-zinc-50",
                  inItems && "notranslate",
                )}
              >
                {inItems
                  ? formatDisplayName(selectedCategory!.name)
                  : "Categories"}
              </div>
              <div className="mt-0.5 text-xs font-normal leading-tight text-zinc-500 dark:text-zinc-400">
                {inItems
                  ? "Order they appear inside this category"
                  : "Order they appear on your menu"}
              </div>
            </div>
            {inItems && (
              <ChipButton
                className="h-8"
                onClick={() => {
                  setHasChanges(false);
                  setSelectedCategory(null);
                }}
              >
                All categories
              </ChipButton>
            )}
            <CountPill>{rows.length}</CountPill>
          </div>

          {rows.length === 0 ? (
            <div className="px-4 py-12 text-center text-[13.5px] text-zinc-500 dark:text-zinc-400">
              {inItems ? "No items in this category." : "No categories yet."}
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="priority-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {rows.map((row, index) => (
                      <Draggable
                        key={row.id}
                        draggableId={row.id}
                        index={index}
                        isDragDisabled={mode !== "drag"}
                      >
                        {(dragProvided, snapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={cn(
                              "flex flex-wrap items-center gap-2.5 gap-y-2.5 border-b border-zinc-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900",
                              snapshot.isDragging &&
                                "rounded-lg shadow-lg ring-2 ring-zinc-900 dark:ring-zinc-50",
                            )}
                          >
                            <span
                              {...dragProvided.dragHandleProps}
                              className={cn(
                                "flex text-zinc-300 dark:text-zinc-600",
                                mode === "drag"
                                  ? "cursor-grab active:cursor-grabbing"
                                  : "opacity-40",
                              )}
                            >
                              <GripVertical size={16} strokeWidth={1.6} />
                            </span>
                            {mode === "drag" && (
                              <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                {index + 1}
                              </span>
                            )}
                            <div className="min-w-0 flex-[1_1_140px]">
                              <div
                                translate="no"
                                className="notranslate truncate text-[13.5px] font-medium leading-tight text-zinc-950 dark:text-zinc-50"
                              >
                                {row.name}
                              </div>
                              <div className="mt-0.5 truncate text-[11.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
                                {row.meta}
                              </div>
                            </div>

                            {mode === "drag" ? (
                              <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                  type="button"
                                  aria-label="Move up"
                                  disabled={index === 0}
                                  onClick={() => move(index, -1)}
                                  className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                >
                                  <ArrowUp size={14} strokeWidth={2} />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Move down"
                                  disabled={index === rows.length - 1}
                                  onClick={() => move(index, 1)}
                                  className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                >
                                  <ArrowDown size={14} strokeWidth={2} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                                  Priority
                                </span>
                                <V3Input
                                  type="number"
                                  className="h-8 w-[56px] px-2.5 text-center text-[13px] font-medium"
                                  value={row.priority || ""}
                                  onChange={(e) =>
                                    setPriorityNumber(row.id, e.target.value)
                                  }
                                  onBlur={resortByNumber}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      resortByNumber();
                                    }
                                  }}
                                />
                              </div>
                            )}

                            {!inItems && (
                              <GhostIconButton
                                size={30}
                                title="Reorder items in this category"
                                disabled={hasChanges}
                                onClick={() => {
                                  const cat = localCategories.find(
                                    (c) => c.id === row.id,
                                  );
                                  if (cat) setSelectedCategory(cat);
                                }}
                              >
                                <ChevronRight size={15} strokeWidth={2} />
                              </GhostIconButton>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </FormCard>
      </div>
    </div>
  );
}
