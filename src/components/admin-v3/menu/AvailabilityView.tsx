"use client";

import * as React from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Search,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";

import Img from "@/components/Img";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { cn } from "@/lib/utils";
import {
  formatSchedule,
  normalizeVisibility,
  resolveVisibility,
  VisibilityConfig,
  Weekday,
} from "@/lib/visibility";
import { Partner, useAuthStore } from "@/store/authStore";
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
  ToggleRow,
  V3Checkbox,
  V3Input,
  V3Toggle,
} from "./formKit";

type ReactivateChoice = "nextday" | "2h" | "4h" | "6h" | "never";

const REACTIVATE_OPTIONS: { value: ReactivateChoice; label: string }[] = [
  { value: "nextday", label: "Next day" },
  { value: "2h", label: "In 2 hours" },
  { value: "4h", label: "In 4 hours" },
  { value: "6h", label: "In 6 hours" },
  { value: "never", label: "Never — keep off until I turn it on" },
];

const NEXT_DAY_TIME_KEY = "scheduledAvailability.nextDayTime";

const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const parseStorefrontSettings = (sf: unknown): Record<string, unknown> => {
  if (!sf) return {};
  if (typeof sf === "string") {
    try {
      return JSON.parse(sf) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return sf as Record<string, unknown>;
};

const computeReactivateAt = (
  choice: ReactivateChoice,
  nextDayTime: string,
): string | null => {
  if (choice === "never") return null;
  if (choice === "nextday") {
    const [h, m] = nextDayTime.split(":").map(Number);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
    return d.toISOString();
  }
  const hrs = choice === "2h" ? 2 : choice === "4h" ? 4 : 6;
  return new Date(Date.now() + hrs * 60 * 60 * 1000).toISOString();
};

const formatReactivateLabel = (iso: string | null): string => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString([], {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

/** Live / unavailable / scheduled — the three states the design filters on. */
type ItemState = "live" | "off" | "scheduled";

function itemState(item: MenuItem): ItemState {
  if (item.is_available === false) return "off";
  const cfg = normalizeVisibility(item.visibility_config);
  if (cfg.type === "scheduled" || (cfg.type === "default" && cfg.hidden))
    return "scheduled";
  return "live";
}

const STATE_PILL: Record<ItemState, { label: string; dot: string; cls: string }> =
  {
    live: {
      label: "Live",
      dot: "bg-green-600",
      cls: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
    },
    off: {
      label: "Unavailable",
      dot: "bg-red-500",
      cls: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
    },
    scheduled: {
      label: "Scheduled",
      dot: "bg-amber-500",
      cls: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
    },
  };

export function AvailabilityView({ onBack }: { onBack: () => void }) {
  const { categories, fetchCategories, updateCategory } = useCategoryStore();
  const { items, fetchMenu, updateItem, bulkSetAvailability } = useMenuStore();
  const { userData, setState } = useAuthStore();
  const partner = userData as Partner | undefined;
  const timezone =
    (partner as unknown as { timezone?: string })?.timezone || "Asia/Kolkata";

  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | ItemState>("all");
  const [openCategory, setOpenCategory] = React.useState<string | null>(null);
  const [expandedItem, setExpandedItem] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const [hideUnavailable, setHideUnavailable] = React.useState(false);
  const [savingHide, setSavingHide] = React.useState(false);
  const [scheduledAvailability, setScheduledAvailability] =
    React.useState(false);
  const [savingScheduled, setSavingScheduled] = React.useState(false);
  const [pendingOffItem, setPendingOffItem] = React.useState<MenuItem | null>(
    null,
  );
  const [reactivateChoice, setReactivateChoice] =
    React.useState<ReactivateChoice>("nextday");
  const [nextDayTime, setNextDayTime] = React.useState("09:00");

  React.useEffect(() => {
    if (userData?.id) {
      fetchCategories(userData.id);
      fetchMenu();
    }
  }, [userData?.id, fetchCategories, fetchMenu]);

  React.useEffect(() => {
    setHideUnavailable(!!partner?.hide_unavailable);
  }, [partner?.hide_unavailable]);

  React.useEffect(() => {
    setScheduledAvailability(
      !!parseStorefrontSettings(partner?.storefront_settings)
        ?.scheduledAvailability,
    );
  }, [partner?.storefront_settings]);

  React.useEffect(() => {
    try {
      const t = localStorage.getItem(NEXT_DAY_TIME_KEY);
      if (t) setNextDayTime(t);
    } catch {
      /* ignore */
    }
  }, []);

  /* --------------------------------------------------------------- data */

  const groups = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .map((cat) => {
        const catItems = items
          .filter((i) => i.category.id === cat.id)
          .sort((a, b) => (a.priority || 0) - (b.priority || 0));
        return { category: cat, items: catItems };
      })
      .sort((a, b) => (a.category.priority || 0) - (b.category.priority || 0))
      .map((g) => {
        if (!q) return g;
        const catMatch = g.category.name.toLowerCase().includes(q);
        if (catMatch) return g;
        const matching = g.items.filter((i) =>
          i.name.toLowerCase().includes(q),
        );
        return matching.length > 0 ? { ...g, items: matching } : null;
      })
      .filter(Boolean) as { category: Category; items: MenuItem[] }[];
  }, [categories, items, query]);

  const counts = React.useMemo(() => {
    let live = 0;
    let off = 0;
    let scheduled = 0;
    for (const i of items) {
      const s = itemState(i);
      if (s === "live") live++;
      else if (s === "off") off++;
      else scheduled++;
    }
    return { live, off, scheduled, all: items.length };
  }, [items]);

  const visibleItems = (list: MenuItem[]) =>
    filter === "all" ? list : list.filter((i) => itemState(i) === filter);

  const visibleIds = groups
    .flatMap((g) => visibleItems(g.items))
    .map((i) => i.id)
    .filter(Boolean) as string[];
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const selectedCount = Array.from(selected).filter((id) =>
    items.some((i) => i.id === id),
  ).length;

  const setMany = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  /* ---------------------------------------------------------- mutations */

  const handleHideUnavailable = async (checked: boolean) => {
    if (!userData?.id) return;
    const prev = hideUnavailable;
    setHideUnavailable(checked);
    setSavingHide(true);
    try {
      await updatePartner(userData.id, { hide_unavailable: checked });
      revalidateTag(userData.id);
      setState({ hide_unavailable: checked });
      toast.success(
        `Unavailable items are now ${checked ? "hidden from" : "shown on"} your menu`,
      );
    } catch (error) {
      setHideUnavailable(prev);
      console.error("Error updating hide_unavailable:", error);
      toast.error("Failed to update setting");
    } finally {
      setSavingHide(false);
    }
  };

  const handleScheduledAvailability = async (checked: boolean) => {
    if (!userData?.id) return;
    const prev = scheduledAvailability;
    setScheduledAvailability(checked);
    setSavingScheduled(true);
    try {
      const merged = {
        ...parseStorefrontSettings(partner?.storefront_settings),
        scheduledAvailability: checked,
      };
      await updatePartner(userData.id, { storefront_settings: merged });
      revalidateTag(userData.id);
      // The Partner type declares this column as a string, but every reader goes
      // through a parse-or-pass-through helper — admin-v2 sets the object here
      // too, and writing a string instead would diverge from it.
      setState({ storefront_settings: merged as unknown as string });
      toast.success(`Scheduled availability ${checked ? "enabled" : "disabled"}`);
    } catch (error) {
      setScheduledAvailability(prev);
      console.error("Error updating scheduled availability:", error);
      toast.error("Failed to update setting");
    } finally {
      setSavingScheduled(false);
    }
  };

  const handleCategoryToggle = async (category: Category) => {
    try {
      const next = !category.is_active;
      await updateCategory({ ...category, is_active: next });
      toast.success(`Category ${next ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Failed to update category:", error);
      toast.error("Failed to update category");
    }
  };

  const handleItemToggle = async (item: MenuItem) => {
    if (item.is_available && scheduledAvailability) {
      setReactivateChoice("nextday");
      setPendingOffItem(item);
      return;
    }
    try {
      await updateItem(
        item.id!,
        item.is_available
          ? { is_available: false }
          : { is_available: true, reactivate_at: null },
      );
    } catch (error) {
      console.error("Failed to update item:", error);
      toast.error("Failed to update item");
    }
  };

  const confirmTurnOff = async () => {
    const item = pendingOffItem;
    if (!item) return;
    const reactivate_at = computeReactivateAt(reactivateChoice, nextDayTime);
    if (reactivateChoice === "nextday") {
      try {
        localStorage.setItem(NEXT_DAY_TIME_KEY, nextDayTime);
      } catch {
        /* ignore */
      }
    }
    setPendingOffItem(null);
    try {
      await updateItem(item.id!, { is_available: false, reactivate_at });
      const when = formatReactivateLabel(reactivate_at);
      toast.success(
        when
          ? `"${item.name}" turned off — back on ${when}`
          : `"${item.name}" turned off`,
      );
    } catch (error) {
      console.error("Failed to update item:", error);
      toast.error("Failed to update item");
    }
  };

  const setCategorySchedule = async (
    category: Category,
    next: VisibilityConfig,
  ) => {
    try {
      await updateCategory({ ...category, visibility_config: next });
    } catch (error) {
      console.error(error);
      toast.error("Failed to update visibility");
    }
  };

  const setItemSchedule = async (item: MenuItem, next: VisibilityConfig) => {
    try {
      await updateItem(item.id!, { visibility_config: next });
    } catch (error) {
      console.error(error);
      toast.error("Failed to update visibility");
    }
  };

  const bulk = async (makeAvailable: boolean) => {
    const ids = Array.from(selected).filter((id) =>
      items.some((i) => i.id === id),
    );
    if (ids.length === 0) return;
    try {
      await bulkSetAvailability(ids, makeAvailable);
      setSelected(new Set());
    } catch {
      /* store surfaces its own toast; keep the selection so a retry is possible */
    }
  };

  /* ------------------------------------------------------------- render */

  const filterChips: { key: "all" | ItemState; label: string; n: number }[] = [
    { key: "all", label: "All", n: counts.all },
    { key: "live", label: "Live", n: counts.live },
    { key: "off", label: "Unavailable", n: counts.off },
    { key: "scheduled", label: "Scheduled", n: counts.scheduled },
  ];

  return (
    <div className="flex flex-col">
      <SubViewHeader
        title="Manage Availability"
        subtitle={`${counts.live} live · ${counts.off} unavailable · ${counts.scheduled} scheduled across ${categories.length} categories`}
        onBack={onBack}
      >
        <div className="flex h-9 min-w-0 flex-[1_1_180px] items-center gap-2.5 rounded-md border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-800 sm:max-w-[300px]">
          <Search size={15} strokeWidth={1.8} className="shrink-0 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories or items…"
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-normal leading-none text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </div>
      </SubViewHeader>

      <div className="flex flex-col gap-3.5 pb-24 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        <FormCard>
          <ToggleRow
            title="Hide unavailable items"
            description="When on, items that are unavailable, out of stock, or off-schedule are removed from your live menu. When off, they stay on the menu shown as “Unavailable”."
            checked={hideUnavailable}
            disabled={savingHide}
            onChange={handleHideUnavailable}
          />
          <ToggleRow
            title="Scheduled availability"
            description="When on, turning an item off asks when it should automatically turn back on (next day, in a few hours, or never)."
            checked={scheduledAvailability}
            disabled={savingScheduled}
            onChange={handleScheduledAvailability}
            last
          />
        </FormCard>

        <div className="flex flex-wrap items-center gap-2.5 px-3.5 lg:px-0">
          <div className="flex shrink-0 items-center gap-2.5">
            <V3Checkbox
              checked={allVisibleSelected}
              label="Select all"
              onChange={() => setMany(visibleIds, !allVisibleSelected)}
            />
            <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
              Select all
            </span>
          </div>
          <div className="h-[22px] w-px bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex gap-1.5 overflow-x-auto py-px">
            {filterChips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilter(c.key)}
                className={cn(
                  "h-8 shrink-0 whitespace-nowrap rounded-md px-3 text-[12.5px] font-medium leading-none transition-colors",
                  filter === c.key
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                )}
              >
                {c.label} {c.n}
              </button>
            ))}
          </div>
        </div>

        {groups.length === 0 ? (
          <FormCard className="px-4 py-12 text-center">
            <p className="text-[13.5px] font-medium text-zinc-500 dark:text-zinc-400">
              No categories or items match that search.
            </p>
          </FormCard>
        ) : (
          groups.map(({ category, items: catItems }) => {
            const open = openCategory === category.id;
            const shown = visibleItems(catItems);
            const ids = shown.map((i) => i.id).filter(Boolean) as string[];
            const allSelected =
              ids.length > 0 && ids.every((id) => selected.has(id));
            const cfg = normalizeVisibility(category.visibility_config);
            const scheduleLabel =
              cfg.type === "scheduled"
                ? formatSchedule(category.visibility_config)
                : cfg.hidden
                  ? "Hidden"
                  : "Always on";
            return (
              <FormCard key={category.id} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 gap-y-2.5 px-4 py-3.5">
                  <V3Checkbox
                    checked={allSelected}
                    label={`Select all in ${formatDisplayName(category.name)}`}
                    onChange={() => setMany(ids, !allSelected)}
                  />
                  <span
                    translate="no"
                    className="notranslate min-w-0 flex-[1_1_160px] truncate text-[14.5px] font-semibold leading-tight tracking-[-0.01em] text-zinc-950 dark:text-zinc-50"
                  >
                    {formatDisplayName(category.name)}
                  </span>
                  <CountPill>{catItems.length} items</CountPill>
                  <CountPill>{scheduleLabel}</CountPill>
                  <V3Toggle
                    checked={category.is_active !== false}
                    label={`Turn ${formatDisplayName(category.name)} on or off`}
                    onChange={() => handleCategoryToggle(category)}
                  />
                  <button
                    type="button"
                    aria-label={open ? "Collapse category" : "Expand category"}
                    onClick={() => setOpenCategory(open ? null : category.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {open ? (
                      <ChevronUp size={15} strokeWidth={2} />
                    ) : (
                      <ChevronDown size={15} strokeWidth={2} />
                    )}
                  </button>
                </div>

                {open && (
                  <>
                    <CategoryScheduleEditor
                      value={category.visibility_config}
                      onChange={(next) => setCategorySchedule(category, next)}
                    />

                    {shown.length === 0 ? (
                      <div className="border-t border-zinc-100 px-4 py-8 text-center text-[13px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                        No matching items in this category.
                      </div>
                    ) : (
                      shown.map((item) => {
                        const state = itemState(item);
                        const pill = STATE_PILL[state];
                        const resolved = resolveVisibility(
                          item.visibility_config,
                          category.visibility_config,
                          timezone,
                        );
                        const itemOpen = expandedItem === item.id;
                        return (
                          <div
                            key={item.id}
                            className="border-t border-zinc-100 dark:border-zinc-800"
                          >
                            <div className="flex flex-wrap items-center gap-3 gap-y-2.5 px-4 py-3">
                              <V3Checkbox
                                checked={
                                  item.id ? selected.has(item.id) : false
                                }
                                label={`Select ${item.name}`}
                                onChange={() =>
                                  item.id && setMany([item.id], !selected.has(item.id))
                                }
                              />
                              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500">
                                {item.image_url ? (
                                  <Img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <UtensilsCrossed size={15} strokeWidth={1.6} />
                                )}
                              </div>
                              <div className="min-w-0 flex-[1_1_150px]">
                                <div
                                  translate="no"
                                  className="notranslate truncate text-[13.5px] font-medium leading-tight text-zinc-950 dark:text-zinc-50"
                                >
                                  {item.name}
                                </div>
                                <div className="mt-0.5 truncate text-[11.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
                                  {item.is_veg === true
                                    ? "Veg"
                                    : item.is_veg === false
                                      ? "Non-Veg"
                                      : "Other"}{" "}
                                  · {partner?.currency || "₹"}
                                  {item.variants && item.variants.length > 0
                                    ? `${Math.min(...item.variants.map((v) => v.price))} onwards`
                                    : item.price}
                                </div>
                              </div>
                              <span
                                className={cn(
                                  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-[9px] py-[3px] text-[11.5px] font-medium leading-normal",
                                  pill.cls,
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    pill.dot,
                                  )}
                                />
                                {pill.label}
                              </span>
                              <V3Toggle
                                checked={item.is_available !== false}
                                label={`Turn ${item.name} on or off`}
                                onChange={() => handleItemToggle(item)}
                              />
                              <GhostIconButton
                                size={30}
                                title={
                                  itemOpen ? "Hide schedule" : "Edit schedule"
                                }
                                onClick={() =>
                                  setExpandedItem(
                                    itemOpen ? null : (item.id ?? null),
                                  )
                                }
                              >
                                <Clock size={15} strokeWidth={1.7} />
                              </GhostIconButton>
                            </div>

                            {(itemOpen || resolved.conflict) && (
                              <div className="px-4 pb-3.5">
                                {resolved.conflict && (
                                  <div className="mb-2.5 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                                    <AlertTriangle
                                      size={14}
                                      className="mt-px shrink-0"
                                    />
                                    <span>
                                      This item&apos;s schedule is overridden by
                                      the category schedule. Category wins.
                                    </span>
                                  </div>
                                )}
                                {itemOpen && (
                                  <ScheduleFields
                                    value={item.visibility_config}
                                    onChange={(next) =>
                                      setItemSchedule(item, next)
                                    }
                                    title="Item schedule"
                                    description="Leave on Always on to follow the category's hours."
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </FormCard>
            );
          })
        )}
      </div>

      {selectedCount > 0 && (
        <div className="sticky bottom-0 z-[6] mx-0 flex flex-wrap items-center gap-2.5 border border-x-0 border-zinc-200 bg-white px-3.5 py-3 shadow-[0_-2px_12px_rgba(9,9,11,.06)] dark:border-zinc-800 dark:bg-zinc-900 lg:mx-[clamp(14px,3vw,28px)] lg:rounded-[10px] lg:border-x">
          <span className="min-w-0 flex-1 text-[13.5px] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            {selectedCount} selected
          </span>
          <ChipButton className="h-9" onClick={() => bulk(true)}>
            Mark available
          </ChipButton>
          <AdminV3Button
            variant="primary"
            className="h-9"
            onClick={() => bulk(false)}
          >
            Mark unavailable
          </AdminV3Button>
          <ChipButton className="h-9" onClick={() => setSelected(new Set())}>
            Clear
          </ChipButton>
        </div>
      )}

      <Dialog
        open={!!pendingOffItem}
        onOpenChange={(o) => {
          if (!o) setPendingOffItem(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="pr-8">
              Turn off{" "}
              <span translate="no" className="notranslate">
                &ldquo;{pendingOffItem?.name}&rdquo;
              </span>
            </DialogTitle>
            <DialogDescription>
              When should it automatically turn back on?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {REACTIVATE_OPTIONS.map((opt) => (
              <div key={opt.value}>
                <button
                  type="button"
                  onClick={() => setReactivateChoice(opt.value)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-[13px] font-medium transition-colors",
                    reactivateChoice === opt.value
                      ? "border-zinc-900 bg-zinc-50 text-zinc-950 dark:border-zinc-50 dark:bg-zinc-800 dark:text-zinc-50"
                      : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 shrink-0 rounded-full border-[1.5px]",
                      reactivateChoice === opt.value
                        ? "border-zinc-900 bg-zinc-900 dark:border-zinc-50 dark:bg-zinc-50"
                        : "border-zinc-300 dark:border-zinc-600",
                    )}
                  />
                  {opt.label}
                </button>
                {opt.value === "nextday" && reactivateChoice === "nextday" && (
                  <div className="ml-9 mt-2 flex items-center gap-2">
                    <span className="text-[13px] text-zinc-500 dark:text-zinc-400">
                      at
                    </span>
                    <V3Input
                      type="time"
                      className="w-32"
                      value={nextDayTime}
                      onChange={(e) => setNextDayTime(e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <ChipButton className="h-9" onClick={() => setPendingOffItem(null)}>
              Cancel
            </ChipButton>
            <AdminV3Button
              variant="primary"
              className="h-9"
              onClick={confirmTurnOff}
            >
              Turn off
            </AdminV3Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------- schedule sub-editors */

function CategoryScheduleEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (next: VisibilityConfig) => void;
}) {
  return (
    <div className="mx-4 mb-3.5">
      <ScheduleFields
        value={value}
        onChange={onChange}
        title="Category schedule"
        description="Applies to every item unless the item sets its own hours."
      />
    </div>
  );
}

/**
 * The design's day-chips + from/to schedule editor. It writes exactly the same
 * `VisibilityConfig` shape as admin-v2's VisibilityEditor, so a schedule set
 * here and one set there cannot diverge.
 */
function ScheduleFields({
  value,
  onChange,
  title,
  description,
}: {
  value: unknown;
  onChange: (next: VisibilityConfig) => void;
  title: string;
  description: string;
}) {
  const cfg = normalizeVisibility(value);
  const scheduled = cfg.type === "scheduled";
  const days = scheduled ? cfg.days : [];
  const from = scheduled ? cfg.from : "09:00";
  const to = scheduled ? cfg.to : "22:00";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-700 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="min-w-0 flex-[1_1_200px]">
          <div className="text-[13px] font-medium leading-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </div>
          <div className="mt-0.5 text-xs font-normal leading-tight text-zinc-500 dark:text-zinc-400">
            {description}
          </div>
        </div>
        <ChipButton
          onClick={() =>
            scheduled
              ? onChange({ type: "default", hidden: false })
              : onChange({
                  type: "scheduled",
                  days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
                  from: "09:00",
                  to: "22:00",
                })
          }
        >
          {scheduled ? "Scheduled" : "Always on"}
        </ChipButton>
      </div>

      {scheduled && (
        <>
          <div className="flex flex-wrap gap-1.5 gap-y-2">
            {WEEKDAYS.map((d) => {
              const on = days.includes(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() =>
                    onChange({
                      type: "scheduled",
                      days: on
                        ? days.filter((x) => x !== d.key)
                        : [...days, d.key],
                      from,
                      to,
                    })
                  }
                  className={cn(
                    "h-[30px] shrink-0 rounded-full px-3 text-xs font-medium leading-none transition-colors",
                    on
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <div className="min-w-0 flex-[1_1_160px]">
              <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                From
              </label>
              <V3Input
                type="time"
                value={from}
                onChange={(e) =>
                  onChange({
                    type: "scheduled",
                    days,
                    from: e.target.value,
                    to,
                  })
                }
              />
            </div>
            <div className="min-w-0 flex-[1_1_160px]">
              <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                To
              </label>
              <V3Input
                type="time"
                value={to}
                onChange={(e) =>
                  onChange({
                    type: "scheduled",
                    days,
                    from,
                    to: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
