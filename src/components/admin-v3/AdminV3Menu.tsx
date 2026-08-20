"use client";

import * as React from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GripVertical,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Power,
  Search,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";

import Img from "@/components/Img";
import { AdminV2ItemRecommendations } from "@/components/admin-v2/AdminV2ItemRecommendations";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { fillOneItemFromGoogle } from "@/app/actions/googleImageFallback";
import { formatPrice } from "@/lib/constants";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { runPool } from "@/lib/runPool";
import { cn } from "@/lib/utils";
import { Partner, useAuthStore } from "@/store/authStore";
import {
  formatDisplayName,
  useCategoryStore,
} from "@/store/categoryStore_hasura";
import { MenuItem, useMenuStore } from "@/store/menuStore_hasura";
import { AddCategoryView } from "./menu/AddCategoryView";
import { AvailabilityView } from "./menu/AvailabilityView";
import { ItemEditor } from "./menu/ItemEditor";
import { PriorityView } from "./menu/PriorityView";
import {
  ChipButton,
  CountPill,
  FormCard,
  GhostIconButton,
  V3Input,
  V3Toggle,
} from "./menu/formKit";

type View =
  | { kind: "list" }
  | { kind: "add" }
  | { kind: "edit"; itemId: string }
  | { kind: "recommend"; itemId: string }
  | { kind: "availability" }
  | { kind: "priority" }
  | { kind: "addCategory" };

type AvailabilityFilter = "all" | "available" | "unavailable";

/** Persist the mutation the "Get all images" pass writes back to Hasura. */
const SET_IMAGES = `mutation SetImages($updates: [menu_updates!]!) {
  update_menu_many(updates: $updates) { affected_rows }
}`;

const TABLE_COLS =
  "grid-cols-[84px_minmax(128px,1fr)_104px_minmax(180px,1.8fr)_84px_82px]";

export function AdminV3Menu() {
  const {
    items: menu,
    fetchMenu,
    updateItem,
    patchImageLocal,
    groupedItems,
    groupItems,
    deleteCategoryAndItems,
    updateCategoriesAsBatch,
    updateItemsAsBatch,
  } = useMenuStore();
  const { categories, fetchCategories, updateCategory } = useCategoryStore();
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;
  const currency = partner?.currency || "₹";
  // Petpooja owns the menu on its own partners — items, categories, prices and
  // variants are synced in, so the create/rename/delete controls are hidden.
  const isPetpooja = !!partner?.petpooja_restaurant_id;

  const [view, setView] = React.useState<View>({ kind: "list" });

  // Deep link, same shape admin-v2 used (?menuPanel=availability|priority) and
  // the same mount-time window.location read AdminV3Settings does for ?sg/?ss —
  // not useSearchParams, which would need a Suspense boundary this client page
  // does not have. Read once: after mount the panel is ordinary local state.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const panel = new URLSearchParams(window.location.search).get("menuPanel");
    if (panel === "availability") setView({ kind: "availability" });
    else if (panel === "priority") setView({ kind: "priority" });
  }, []);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<AvailabilityFilter>("all");
  const [openCategories, setOpenCategories] = React.useState<string[]>([]);

  /**
   * Reordering is only safe when the list on screen IS the whole list.
   *
   * Both the search box and the availability filter drop items — and whole
   * categories — from `filtered`. Writing priority = index + 1 over a trimmed
   * list would renumber the visible rows on top of the hidden ones and shuffle
   * them arbitrarily, so drag is locked until the view is unfiltered.
   */
  const reorderLocked = !!query.trim() || filter !== "all";
  const reorderLockHint = query.trim()
    ? "Clear the search to reorder"
    : "Show all items to reorder";

  /**
   * In-place reordering for categories and for items within a category.
   *
   * Priority is 1-based and ascending — menuStore.groupItems() sorts categories
   * by category.priority and items by item.priority, so writing index+1 for the
   * whole list is what makes the new order stick. Both batch actions re-group
   * the store on success, so the list re-sorts itself and no local mirror of the
   * order is needed; a failed write leaves the store untouched, which snaps the
   * row back where it came from.
   *
   * `type` keeps the two lists apart: without it a category could be dropped
   * into an item list, since every Droppable on the screen shares one context.
   */
  const onDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result;
    if (reorderLocked) return;
    if (!destination || destination.index === source.index) return;

    if (type === "v3-category") {
      // The list only shows categories that HAVE items, so the drag order is a
      // subset of the real one. Map names back to the store's category rows and
      // drop any that no longer exist.
      const visible = Object.keys(filtered)
        .map((name) => {
          const id = groupedItems[name]?.[0]?.category?.id;
          return categories.find((c) => c.id === id) ?? null;
        })
        .filter(Boolean) as typeof categories;
      if (visible.length < 2) return;

      const moved = [...visible];
      const [picked] = moved.splice(source.index, 1);
      moved.splice(destination.index, 0, picked);

      // Renumbering only the visible categories would leave the empty ones
      // sitting on stale priorities and tie with the new ones. So renumber the
      // WHOLE list: walk it in current priority order and, wherever a visible
      // category sat, drop in the next one from the new order. Empty categories
      // keep the exact slot they had.
      const visibleIds = new Set(visible.map((c) => c.id));
      let cursor = 0;
      const payload = [...categories]
        .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
        .map((c) => (visibleIds.has(c.id) ? moved[cursor++] : c))
        .map((c, i) => ({ ...c, priority: i + 1 }));

      await updateCategoriesAsBatch(payload).catch(() => {});
      return;
    }

    if (type === "v3-item") {
      // Items render TWICE — a table from md up and cards below it — so each
      // category owns two droppables and they need distinct ids. Only the
      // visible one can be dragged, and a drop into the other list is refused
      // outright: an item may only move within its own category.
      if (destination.droppableId !== source.droppableId) return;
      // id is `v3-items-<desktop|mobile>-<categoryName>`; the name itself can
      // contain hyphens, so strip the known prefix rather than splitting on "-".
      const categoryName = source.droppableId.replace(
        /^v3-items-(?:desktop|mobile)-/,
        "",
      );

      const list = filtered[categoryName];
      if (!list) return;
      const next = [...list];
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);

      await updateItemsAsBatch(
        next.map((it, i) => ({ id: it.id!, priority: i + 1 })),
      ).catch(() => {});
    }
  };
  const [renaming, setRenaming] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  const [fetchingImages, setFetchingImages] = React.useState(false);
  const [imagesDone, setImagesDone] = React.useState(0);
  const [imagesTotal, setImagesTotal] = React.useState(0);

  React.useEffect(() => {
    if (userData?.id) {
      fetchMenu();
      fetchCategories(userData.id);
    }
  }, [userData?.id, fetchMenu, fetchCategories]);

  /* ------------------------------------------------------------ filtering */

  const filtered = React.useMemo(() => {
    if (!groupedItems) return {} as Record<string, MenuItem[]>;
    const out: Record<string, MenuItem[]> = {};
    const q = query.trim().toLowerCase();

    Object.entries(groupedItems).forEach(([category, items]) => {
      const categoryMatches = category.toLowerCase().includes(q);
      const categoryId = items[0]?.category?.id;
      const fromStore = categories.find((c) => c.id === categoryId);
      const active = fromStore
        ? fromStore.is_active !== false
        : items[0]?.category?.is_active !== false;

      // An inactive category is off as a whole, so its items are never "available".
      if (!active) {
        if (filter === "available") return;
        const matching = items.filter(
          (i) => categoryMatches || i.name.toLowerCase().includes(q),
        );
        if (!q || categoryMatches || matching.length > 0) {
          out[category] = q ? matching : items;
        }
        return;
      }

      const rows = items.filter((item) => {
        const matchesSearch =
          categoryMatches || item.name.toLowerCase().includes(q);
        const matchesFilter =
          filter === "all" ||
          (filter === "available" && item.is_available !== false) ||
          (filter === "unavailable" && item.is_available === false);
        return matchesSearch && matchesFilter;
      });

      if (filter !== "all" && rows.length === 0) return;
      if (!q || categoryMatches || rows.length > 0) out[category] = rows;
    });
    return out;
  }, [groupedItems, query, filter, categories]);

  // Searching should reveal what it matched rather than leaving every section shut.
  React.useEffect(() => {
    if (query.trim()) setOpenCategories(Object.keys(filtered));
  }, [query, filtered]);

  /* ------------------------------------------------------------ mutations */

  const toggleItem = async (item: MenuItem) => {
    try {
      await updateItem(
        item.id!,
        item.is_available !== false
          ? { is_available: false }
          : { is_available: true, reactivate_at: null },
      );
    } catch (error) {
      console.error("Failed to update availability:", error);
      toast.error("Failed to update availability");
    }
  };

  const toggleCategory = async (categoryId: string, items: MenuItem[]) => {
    const fromStore = categories.find((c) => c.id === categoryId);
    const current = fromStore
      ? fromStore.is_active !== false
      : items[0]?.category?.is_active !== false;
    try {
      if (fromStore) {
        await updateCategory({ ...fromStore, is_active: !current });
      } else if (items[0]?.category) {
        const c = items[0].category;
        await updateCategory({
          id: categoryId,
          name: c.name,
          priority: c.priority,
          is_active: !current,
          visibility_config: c.visibility_config,
        });
      }
      toast.success(`Category ${!current ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Failed to update category:", error);
      toast.error("Failed to update category");
    }
  };

  const saveRename = async () => {
    if (!renaming) return;
    const items = Object.values(groupedItems).find(
      (list) => list[0]?.category.id === renaming.id,
    );
    const current = items?.[0]?.category;
    if (!current) {
      setRenaming(null);
      return;
    }
    try {
      await updateCategory({
        id: renaming.id,
        name: renaming.name,
        priority: current.priority,
        is_active: current.is_active,
      });
      toast.success("Category updated");
      setRenaming(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update category");
    }
  };

  /**
   * "Get all images" — same two-stage fill as admin-v2: one lookup against the
   * shared image bank, then Google one item at a time with bounded concurrency,
   * persisting and reflecting each image the moment it lands.
   */
  const handleGetAllImages = async () => {
    const without = menu.filter((item) => !item.image_url);
    if (without.length === 0) {
      toast.info("All items already have images!");
      return;
    }

    setFetchingImages(true);
    setImagesTotal(without.length);
    setImagesDone(0);
    let done = 0;
    const bump = (n = 1) => {
      done += n;
      setImagesDone(done);
    };

    try {
      const uniqueNames = Array.from(
        new Set(without.map((i) => i.name).filter(Boolean)),
      );
      const { item_images } = await fetchFromHasura(
        `query BankImages($names: [String!]!) {
          item_images(where: { item_name: { _in: $names } }) {
            item_name
            image_url
          }
        }`,
        { names: uniqueNames },
      );
      const urlByName = new Map<string, string>();
      for (const row of (item_images as
        | { item_name: string; image_url: string }[]
        | undefined) || []) {
        const key = (row.item_name || "").trim().toLowerCase();
        if (key && row.image_url && !urlByName.has(key))
          urlByName.set(key, row.image_url);
      }

      const matched = new Set<string>();
      const bankUpdates: {
        where: { id: { _eq: string } };
        _set: { image_url: string };
      }[] = [];
      const bankByUrl = new Map<string, string[]>();
      for (const item of without) {
        const url = urlByName.get((item.name || "").trim().toLowerCase());
        if (url && item.id) {
          bankUpdates.push({
            where: { id: { _eq: item.id } },
            _set: { image_url: url },
          });
          matched.add(item.id);
          const arr = bankByUrl.get(url) || [];
          arr.push(item.id);
          bankByUrl.set(url, arr);
        }
      }
      const bankFound = bankUpdates.length;
      if (bankFound > 0) {
        await fetchFromHasura(SET_IMAGES, { updates: bankUpdates });
        for (const [url, ids] of bankByUrl) patchImageLocal(ids, url);
        bump(bankFound);
      }

      const missGroups = new Map<
        string,
        { ids: string[]; category_name?: string }
      >();
      for (const m of without) {
        if (!m.id || matched.has(m.id)) continue;
        const name = (m.name || "").trim();
        if (!name) continue;
        const g = missGroups.get(name) || {
          ids: [],
          category_name: m.category?.name,
        };
        g.ids.push(m.id);
        missGroups.set(name, g);
      }

      let googleFound = 0;
      const partnerId = userData?.id;
      if (missGroups.size > 0 && partnerId) {
        const partnerName =
          partner?.name?.trim() || partner?.store_name?.trim() || "Partner";
        await runPool([...missGroups.keys()], 6, async (name) => {
          const g = missGroups.get(name)!;
          const r = await fillOneItemFromGoogle(partnerId, partnerName, {
            id: g.ids[0],
            name,
            category_name: g.category_name,
          });
          if (r?.image_url) {
            googleFound += g.ids.length;
            await fetchFromHasura(SET_IMAGES, {
              updates: g.ids.map((id) => ({
                where: { id: { _eq: id } },
                _set: { image_url: r.image_url },
              })),
            });
            patchImageLocal(g.ids, r.image_url);
          }
          bump(g.ids.length);
        });
      }

      const found = bankFound + googleFound;
      if (found > 0) {
        const parts: string[] = [];
        if (bankFound > 0) parts.push(`${bankFound} from the image bank`);
        if (googleFound > 0) parts.push(`${googleFound} from Google`);
        toast.success(
          `Added images to ${found} item${found === 1 ? "" : "s"} (${parts.join(", ")})`,
        );
      }
      const notFound = without.length - found;
      if (notFound > 0) {
        toast.info(
          `${notFound} item${notFound === 1 ? "" : "s"} had no image found.`,
        );
      }
    } catch (error) {
      console.error("Get all images failed:", error);
      toast.error("Failed to fetch images.");
    } finally {
      setFetchingImages(false);
    }
  };

  /* ----------------------------------------------------------- sub-views */

  if (view.kind === "availability") {
    return (
      <AvailabilityView
        onBack={() => {
          groupItems();
          setView({ kind: "list" });
        }}
      />
    );
  }
  if (view.kind === "priority") {
    return <PriorityView onBack={() => setView({ kind: "list" })} />;
  }
  if (view.kind === "addCategory") {
    return <AddCategoryView onBack={() => setView({ kind: "list" })} />;
  }
  if (view.kind === "add") {
    return <ItemEditor onBack={() => setView({ kind: "list" })} />;
  }
  if (view.kind === "edit") {
    const item = menu.find((i) => i.id === view.itemId);
    if (item) {
      return (
        <ItemEditor item={item} onBack={() => setView({ kind: "list" })} />
      );
    }
  }
  if (view.kind === "recommend") {
    const item = menu.find((i) => i.id === view.itemId);
    if (item) {
      return (
        <div className="px-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
          <AdminV2ItemRecommendations
            item={item}
            onBack={() => setView({ kind: "list" })}
          />
        </div>
      );
    }
  }

  /* -------------------------------------------------------------- render */

  const priceCell = (item: MenuItem) => {
    const hasVariants = !!item.variants && item.variants.length > 0;
    const value = hasVariants
      ? Math.min(...item.variants!.map((v) => v.price))
      : item.price;
    return (
      <>
        <span className="text-[13.5px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
          {currency}
          {formatPrice(value, userData?.id)}
        </span>
        {hasVariants && (
          <span className="text-[11px] font-normal leading-none text-zinc-500 dark:text-zinc-400">
            onwards
          </span>
        )}
      </>
    );
  };

  const thumb = (item: MenuItem, size: string) => (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 text-zinc-400",
        "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500",
        size,
      )}
    >
      {item.image_url ? (
        <Img
          src={item.image_url}
          alt={item.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <UtensilsCrossed size={16} strokeWidth={1.6} />
      )}
    </div>
  );

  const rowActions = (item: MenuItem) => (
    <>
      <GhostIconButton
        title="Manage recommendations"
        onClick={() => setView({ kind: "recommend", itemId: item.id! })}
        className="relative"
      >
        <Sparkles size={15} strokeWidth={1.7} />
        {(item.recommendations?.length ?? 0) > 0 && (
          <span className="absolute right-0 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white">
            {item.recommendations!.length}
          </span>
        )}
      </GhostIconButton>
      <GhostIconButton
        title="Edit item"
        onClick={() => setView({ kind: "edit", itemId: item.id! })}
      >
        <Pencil size={15} strokeWidth={1.7} />
      </GhostIconButton>
    </>
  );

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
      {/* Search + availability filter */}
      <div className="flex flex-wrap items-center gap-2.5 px-3.5 lg:px-0">
        <div className="flex h-[38px] min-w-0 flex-[1_1_200px] items-center gap-2.5 rounded-md border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-800 sm:max-w-[360px]">
          <Search
            size={15}
            strokeWidth={1.8}
            className="shrink-0 text-zinc-400 dark:text-zinc-500"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items…"
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-normal leading-none text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </div>
        <div className="relative shrink-0">
          <select
            value={filter}
            aria-label="Filter by availability"
            onChange={(e) => setFilter(e.target.value as AvailabilityFilter)}
            className="h-[38px] appearance-none rounded-md border border-zinc-200 bg-white pl-3 pr-8 text-[13px] font-medium leading-none text-zinc-700 outline-none transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
          <ChevronDown
            size={15}
            strokeWidth={2}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 gap-y-2.5 px-3.5 lg:px-0">
        <ChipButton
          className="h-9 text-[13px]"
          onClick={() => setView({ kind: "availability" })}
        >
          <Power size={15} strokeWidth={1.7} />
          Manage Availability
        </ChipButton>
        <ChipButton
          className="h-9 text-[13px]"
          onClick={() => setView({ kind: "priority" })}
        >
          <ArrowUpDown size={15} strokeWidth={1.7} />
          Change Priority
        </ChipButton>
        {!isPetpooja && (
          <>
            <ChipButton
              className="h-9 text-[13px]"
              onClick={() => setView({ kind: "add" })}
            >
              <Plus size={15} strokeWidth={1.7} />
              Add Item
            </ChipButton>
            <ChipButton
              className="h-9 text-[13px]"
              onClick={() => setView({ kind: "addCategory" })}
            >
              <Plus size={15} strokeWidth={1.7} />
              Add Category
            </ChipButton>
          </>
        )}
        {partner?.username && (
          <ChipButton
            className="h-9 text-[13px]"
            onClick={() => window.open(`/${partner.username}`, "_blank")}
          >
            <ExternalLink size={15} strokeWidth={1.7} />
            View Menu
          </ChipButton>
        )}
        <ChipButton
          className="h-9 text-[13px]"
          disabled={fetchingImages}
          onClick={handleGetAllImages}
        >
          {fetchingImages ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              {imagesDone}/{imagesTotal}
            </>
          ) : (
            <>
              <ImageIcon size={15} strokeWidth={1.7} />
              Get all images
            </>
          )}
        </ChipButton>
      </div>

      {/* Categories */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-col gap-2.5">
          {Object.keys(filtered).length === 0 ? (
            <FormCard className="px-4 py-14 text-center">
              <p className="text-[13.5px] font-medium text-zinc-500 dark:text-zinc-400">
                {menu.length === 0
                  ? "Your menu is empty."
                  : "No menu items match that search."}
              </p>
              <p className="mt-1 text-[12.5px] text-zinc-400 dark:text-zinc-500">
                {menu.length === 0
                  ? "Add a category, or add items one at a time."
                  : "Try a different search or availability filter."}
              </p>
            </FormCard>
          ) : (
            <Droppable droppableId="v3-categories" type="v3-category">
              {(dropCats) => (
                <div
                  ref={dropCats.innerRef}
                  {...dropCats.droppableProps}
                  className="flex flex-col gap-2.5"
                >
                  {Object.entries(filtered).map(
                    ([category, items], catIndex) => {
                      const categoryId =
                        groupedItems[category]?.[0]?.category?.id;
                      const fromStore = categories.find(
                        (c) => c.id === categoryId,
                      );
                      const active = fromStore
                        ? fromStore.is_active !== false
                        : items[0]?.category?.is_active !== false;
                      const open = openCategories.includes(category);
                      const isRenaming =
                        !!categoryId && renaming?.id === categoryId;
                      const toggleOpen = () =>
                        setOpenCategories((prev) =>
                          prev.includes(category)
                            ? prev.filter((c) => c !== category)
                            : [...prev, category],
                        );

                      return (
                        <Draggable
                          key={category}
                          draggableId={`v3-cat-${category}`}
                          index={catIndex}
                          // Renaming puts an input in the card; dragging it at the same
                          // time would fight that input for the pointer.
                          isDragDisabled={isRenaming || reorderLocked}
                        >
                          {(drag, snap) => (
                            <div ref={drag.innerRef} {...drag.draggableProps}>
                              <FormCard
                                className={cn(
                                  "overflow-hidden",
                                  snap.isDragging &&
                                    "shadow-lg ring-2 ring-zinc-900/10 dark:ring-zinc-50/20",
                                )}
                              >
                                <div
                                  /* The whole header expands the category, not
                                     just the chevron. Anything already wired to
                                     a click is excluded: the rename field and
                                     its buttons, delete, the on/off switch, the
                                     drag handle, and the chevron itself — which
                                     would otherwise fire twice and cancel out. */
                                  onClick={(e) => {
                                    if (isRenaming) return;
                                    const el = e.target as HTMLElement;
                                    if (
                                      el.closest(
                                        "button, input, [data-rfd-drag-handle-draggable-id]",
                                      )
                                    )
                                      return;
                                    toggleOpen();
                                  }}
                                  className={cn(
                                    "flex flex-wrap items-center gap-2.5 gap-y-2.5 px-4 py-3.5",
                                    !isRenaming && "cursor-pointer",
                                  )}
                                >
                                  {/* Real drag handle: dropping writes priority = index + 1 for
                      every category. Greyed out while the list is filtered —
                      see reorderLocked. */}
                                  <span
                                    {...drag.dragHandleProps}
                                    title={
                                      reorderLocked
                                        ? reorderLockHint
                                        : "Drag to reorder categories"
                                    }
                                    aria-label="Drag to reorder categories"
                                    className={cn(
                                      "flex shrink-0 text-zinc-300 transition-colors dark:text-zinc-600",
                                      reorderLocked
                                        ? "cursor-not-allowed opacity-40"
                                        : "cursor-grab hover:text-zinc-500 active:cursor-grabbing dark:hover:text-zinc-400",
                                    )}
                                  >
                                    <GripVertical size={16} strokeWidth={1.6} />
                                  </span>

                                  {isRenaming ? (
                                    <div className="flex min-w-0 flex-[1_1_200px] items-center gap-2">
                                      <V3Input
                                        autoFocus
                                        translate="no"
                                        className="h-8 max-w-[220px]"
                                        value={renaming!.name}
                                        onChange={(e) =>
                                          setRenaming({
                                            id: renaming!.id,
                                            name: e.target.value,
                                          })
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") saveRename();
                                          if (e.key === "Escape")
                                            setRenaming(null);
                                        }}
                                      />
                                      <ChipButton
                                        className="h-8"
                                        onClick={saveRename}
                                      >
                                        Save
                                      </ChipButton>
                                      <GhostIconButton
                                        title="Cancel rename"
                                        onClick={() => setRenaming(null)}
                                      >
                                        <X size={15} strokeWidth={2} />
                                      </GhostIconButton>
                                    </div>
                                  ) : (
                                    <>
                                      <span
                                        translate="no"
                                        className="notranslate min-w-0 max-w-full truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-zinc-950 dark:text-zinc-50"
                                      >
                                        {formatDisplayName(category)}
                                      </span>
                                      {!isPetpooja && categoryId && (
                                        <span className="flex items-center gap-0.5">
                                          <GhostIconButton
                                            title="Rename category"
                                            onClick={() =>
                                              setRenaming({
                                                id: categoryId,
                                                name: formatDisplayName(
                                                  category,
                                                ),
                                              })
                                            }
                                          >
                                            <Pencil
                                              size={15}
                                              strokeWidth={1.7}
                                            />
                                          </GhostIconButton>
                                          <GhostIconButton
                                            tone="danger"
                                            title="Delete category"
                                            onClick={async () => {
                                              if (
                                                await confirmDialog({
                                                  title:
                                                    "Delete this category?",
                                                  description:
                                                    "This will permanently delete the category and all its items.",
                                                  confirmText:
                                                    "Delete category",
                                                  destructive: true,
                                                })
                                              ) {
                                                deleteCategoryAndItems(
                                                  categoryId,
                                                );
                                              }
                                            }}
                                          >
                                            <Trash2
                                              size={15}
                                              strokeWidth={1.7}
                                            />
                                          </GhostIconButton>
                                        </span>
                                      )}
                                      <CountPill>
                                        {items.length} items
                                      </CountPill>
                                    </>
                                  )}

                                  <div className="ml-auto flex items-center gap-2.5">
                                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                      {active ? "On" : "Off"}
                                    </span>
                                    <V3Toggle
                                      size="sm"
                                      checked={active}
                                      label={`Turn ${formatDisplayName(category)} ${active ? "off" : "on"}`}
                                      onChange={() =>
                                        categoryId &&
                                        toggleCategory(categoryId, items)
                                      }
                                    />
                                    <button
                                      type="button"
                                      aria-expanded={open}
                                      aria-label={
                                        open
                                          ? "Collapse category"
                                          : "Expand category"
                                      }
                                      onClick={toggleOpen}
                                      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    >
                                      {open ? (
                                        <ChevronUp size={15} strokeWidth={2} />
                                      ) : (
                                        <ChevronDown
                                          size={15}
                                          strokeWidth={2}
                                        />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {open &&
                                  (items.length === 0 ? (
                                    <div className="border-t border-zinc-200 px-4 py-8 text-center text-[13px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                                      No {filter !== "all" ? filter : ""} items
                                      in this category.
                                    </div>
                                  ) : (
                                    <>
                                      {/* Table — from md up, scrolling inside its own box so the
                          page itself never scrolls sideways. */}
                                      <div className="hidden overflow-x-auto border-t border-zinc-200 dark:border-zinc-800 md:block">
                                        <div className="min-w-[784px]">
                                          <div
                                            className={cn(
                                              "grid items-center bg-zinc-50 dark:bg-zinc-950",
                                              TABLE_COLS,
                                            )}
                                          >
                                            {[
                                              "Image",
                                              "Name",
                                              "Price",
                                              "Description",
                                              "Available",
                                            ].map((h) => (
                                              <div
                                                key={h}
                                                className="whitespace-nowrap px-3.5 py-2.5 text-[12.5px] font-medium leading-none text-zinc-500 dark:text-zinc-400"
                                              >
                                                {h}
                                              </div>
                                            ))}
                                            <div className="whitespace-nowrap px-3.5 py-2.5 text-right text-[12.5px] font-medium leading-none text-zinc-500 dark:text-zinc-400">
                                              Action
                                            </div>
                                          </div>

                                          <Droppable
                                            droppableId={`v3-items-desktop-${category}`}
                                            type="v3-item"
                                          >
                                            {(dropItems) => (
                                              <div
                                                ref={dropItems.innerRef}
                                                {...dropItems.droppableProps}
                                              >
                                                {items.map(
                                                  (item, itemIndex) => (
                                                    <Draggable
                                                      key={item.id}
                                                      draggableId={`v3-item-desktop-${item.id}`}
                                                      index={itemIndex}
                                                      isDragDisabled={
                                                        reorderLocked
                                                      }
                                                    >
                                                      {(idrag, isnap) => (
                                                        <div
                                                          ref={idrag.innerRef}
                                                          {...idrag.draggableProps}
                                                          id={`v3-menu-item-${item.id}`}
                                                          className={cn(
                                                            "grid items-center border-t border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50",
                                                            TABLE_COLS,
                                                            isnap.isDragging &&
                                                              "rounded-lg bg-white shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700",
                                                          )}
                                                        >
                                                          <div className="flex items-center gap-1.5 py-2.5 pl-2 pr-3.5">
                                                            <span
                                                              {...idrag.dragHandleProps}
                                                              title={
                                                                reorderLocked
                                                                  ? reorderLockHint
                                                                  : "Drag to reorder items"
                                                              }
                                                              aria-label="Drag to reorder items"
                                                              className={cn(
                                                                "flex shrink-0 text-zinc-300 transition-colors dark:text-zinc-600",
                                                                reorderLocked
                                                                  ? "cursor-not-allowed opacity-40"
                                                                  : "cursor-grab hover:text-zinc-500 active:cursor-grabbing dark:hover:text-zinc-400",
                                                              )}
                                                            >
                                                              <GripVertical
                                                                size={15}
                                                                strokeWidth={
                                                                  1.6
                                                                }
                                                              />
                                                            </span>
                                                            {thumb(
                                                              item,
                                                              "h-10 w-10",
                                                            )}
                                                          </div>
                                                          <div className="min-w-0 px-3.5 py-2.5">
                                                            <div
                                                              translate="no"
                                                              className="notranslate truncate text-[13.5px] font-medium leading-tight text-zinc-950 dark:text-zinc-50"
                                                            >
                                                              {item.name}
                                                            </div>
                                                            {item.variants &&
                                                              item.variants
                                                                .length > 0 && (
                                                                <div className="mt-0.5 text-[11.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
                                                                  {
                                                                    item
                                                                      .variants
                                                                      .length
                                                                  }{" "}
                                                                  variants
                                                                </div>
                                                              )}
                                                          </div>
                                                          <div className="flex items-baseline gap-1.5 whitespace-nowrap px-3.5 py-2.5">
                                                            {priceCell(item)}
                                                          </div>
                                                          <div
                                                            translate="no"
                                                            title={
                                                              item.description
                                                            }
                                                            className="notranslate min-w-0 truncate px-3.5 py-2.5 text-[12.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400"
                                                          >
                                                            {item.description ||
                                                              "—"}
                                                          </div>
                                                          <div className="px-3.5 py-2.5">
                                                            <V3Toggle
                                                              size="sm"
                                                              checked={
                                                                item.is_available !==
                                                                false
                                                              }
                                                              label={`Turn ${item.name} ${item.is_available !== false ? "off" : "on"}`}
                                                              onChange={() =>
                                                                toggleItem(item)
                                                              }
                                                            />
                                                          </div>
                                                          <div className="flex items-center justify-end gap-0.5 px-3.5 py-2.5">
                                                            {rowActions(item)}
                                                          </div>
                                                        </div>
                                                      )}
                                                    </Draggable>
                                                  ),
                                                )}
                                                {dropItems.placeholder}
                                              </div>
                                            )}
                                          </Droppable>
                                        </div>
                                      </div>

                                      {/* Card list — phones and small tablets. */}
                                      <Droppable
                                        droppableId={`v3-items-mobile-${category}`}
                                        type="v3-item"
                                      >
                                        {(dropItems) => (
                                          <div
                                            ref={dropItems.innerRef}
                                            {...dropItems.droppableProps}
                                            className="flex flex-col gap-2.5 border-t border-zinc-200 p-3 dark:border-zinc-800 md:hidden"
                                          >
                                            {items.map((item, itemIndex) => (
                                              <Draggable
                                                key={item.id}
                                                draggableId={`v3-item-mobile-${item.id}`}
                                                index={itemIndex}
                                                isDragDisabled={reorderLocked}
                                              >
                                                {(idrag, isnap) => (
                                                  <div
                                                    ref={idrag.innerRef}
                                                    {...idrag.draggableProps}
                                                    className={cn(
                                                      "flex gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700",
                                                      isnap.isDragging &&
                                                        "bg-white shadow-lg dark:bg-zinc-900",
                                                    )}
                                                  >
                                                    {/* Press-and-hold on this handle starts the drag;
                                the rest of the card keeps its normal scroll. */}
                                                    <span
                                                      {...idrag.dragHandleProps}
                                                      title={
                                                        reorderLocked
                                                          ? reorderLockHint
                                                          : "Drag to reorder items"
                                                      }
                                                      aria-label="Drag to reorder items"
                                                      className={cn(
                                                        "-ml-1 flex shrink-0 items-center text-zinc-300 dark:text-zinc-600",
                                                        reorderLocked
                                                          ? "cursor-not-allowed opacity-40"
                                                          : "cursor-grab active:cursor-grabbing",
                                                      )}
                                                    >
                                                      <GripVertical
                                                        size={15}
                                                        strokeWidth={1.6}
                                                      />
                                                    </span>
                                                    {thumb(item, "h-11 w-11")}
                                                    <div className="min-w-0 flex-1">
                                                      <div className="flex items-baseline gap-2">
                                                        <div
                                                          translate="no"
                                                          className="notranslate min-w-0 truncate text-[13.5px] font-medium leading-tight text-zinc-950 dark:text-zinc-50"
                                                        >
                                                          {item.name}
                                                        </div>
                                                        <div className="ml-auto flex shrink-0 items-baseline gap-1">
                                                          {priceCell(item)}
                                                        </div>
                                                      </div>
                                                      <div
                                                        translate="no"
                                                        className="notranslate mt-1 line-clamp-2 text-xs font-normal leading-[1.45] text-zinc-500 dark:text-zinc-400"
                                                      >
                                                        {item.description ||
                                                          "—"}
                                                      </div>
                                                      <div className="mt-2.5 flex items-center gap-2">
                                                        {item.variants &&
                                                          item.variants.length >
                                                            0 && (
                                                            <CountPill className="text-[11px]">
                                                              {
                                                                item.variants
                                                                  .length
                                                              }{" "}
                                                              variants
                                                            </CountPill>
                                                          )}
                                                        <div className="ml-auto flex items-center gap-1.5">
                                                          <V3Toggle
                                                            size="sm"
                                                            checked={
                                                              item.is_available !==
                                                              false
                                                            }
                                                            label={`Turn ${item.name} ${item.is_available !== false ? "off" : "on"}`}
                                                            onChange={() =>
                                                              toggleItem(item)
                                                            }
                                                          />
                                                          {rowActions(item)}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </Draggable>
                                            ))}
                                            {dropItems.placeholder}
                                          </div>
                                        )}
                                      </Droppable>
                                    </>
                                  ))}
                              </FormCard>
                            </div>
                          )}
                        </Draggable>
                      );
                    },
                  )}
                  {dropCats.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </div>
      </DragDropContext>
    </div>
  );
}
