"use client";

import * as React from "react";
import {
  Check,
  ImageIcon,
  Info,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import Img from "@/components/Img";
import { ImageGridModalV2 } from "@/components/bulkMenuUpload/ImageGridModalV2";
import CategoryDropdown from "@/components/ui/CategoryDropdown";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { VisibilityEditor } from "@/components/admin-v2/availability/VisibilityEditor";
import {
  createEmptyGroup,
  createEmptyOption,
  sanitizeModifierGroups,
} from "@/components/admin-v2/ModifierGroupsEditor";
import { TAG_CATEGORIES } from "@/data/foodTags";
import { cn } from "@/lib/utils";
import { Partner, useAuthStore } from "@/store/authStore";
import { formatDisplayName, useCategoryStore } from "@/store/categoryStore_hasura";
import {
  MenuItem,
  ModifierGroup,
  useMenuStore,
} from "@/store/menuStore_hasura";
import { AdminV3Button } from "../ui/primitives";
import {
  ChipButton,
  CountPill,
  FormCard,
  FormCardHead,
  GhostIconButton,
  SubViewHeader,
  ToggleRow,
  V3Hint,
  V3Input,
  V3Label,
  V3PriceInput,
  V3Segmented,
  V3Textarea,
  V3Toggle,
} from "./formKit";

type Section =
  | "media"
  | "details"
  | "pricing"
  | "visibility"
  | "variants"
  | "custom";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "media", label: "Image & Tags" },
  { key: "details", label: "Details" },
  { key: "pricing", label: "Pricing" },
  { key: "visibility", label: "Visibility" },
  { key: "variants", label: "Variants" },
  { key: "custom", label: "Customizations" },
];

type EditableVariant = { name: string; price: number; delivery_price?: number };

type FoodType = "veg" | "non" | "other";

/**
 * `true` once the layout is wide enough for the design's three-column form
 * (188px section rail + form + 288px media rail). Below that the media rail
 * folds back into the section list as its own "Image & Tags" step, which is
 * exactly what the design's `isWide` / `notWide` variants describe.
 */
function useIsWideForm(): boolean {
  const [wide, setWide] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1180px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return wide;
}

export function ItemEditor({
  item,
  onBack,
}: {
  /** Undefined = the "Add New Item" variant of the same form. */
  item?: MenuItem;
  onBack: (savedItemId?: string) => void;
}) {
  const isEdit = !!item;
  const { addItem, updateItem, deleteItem } = useMenuStore();
  const { userData } = useAuthStore();
  const { categories, fetchCategories } = useCategoryStore();
  const partner = userData as Partner | undefined;
  const currency = partner?.currency || "₹";
  // Petpooja owns name / category / price / variants / customisations on its own
  // menus — they are rebuilt on every sync, so those fields stay read-only here.
  const isPetpooja = !!partner?.petpooja_restaurant_id;

  const wide = useIsWideForm();
  const [section, setSection] = React.useState<Section>("details");
  const effectiveSection: Section =
    wide && section === "media" ? "details" : section;

  const [submitting, setSubmitting] = React.useState(false);
  const [imageModalOpen, setImageModalOpen] = React.useState(false);
  const [tagsModalOpen, setTagsModalOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [name, setName] = React.useState(item?.name ?? "");
  const [nameSecondary, setNameSecondary] = React.useState(
    item?.name_secondary ?? "",
  );
  const [rtl, setRtl] = React.useState(!!item?.name_secondary_rtl);
  const [description, setDescription] = React.useState(item?.description ?? "");
  const [category, setCategory] = React.useState<MenuItem["category"] | null>(
    item?.category ?? null,
  );
  const [foodType, setFoodType] = React.useState<FoodType>(
    item?.is_veg === true ? "veg" : item?.is_veg === false ? "non" : "other",
  );

  const [price, setPrice] = React.useState(
    item ? String(item.price ?? "") : "",
  );
  const [deliveryPrice, setDeliveryPrice] = React.useState(
    item?.delivery_price != null ? String(item.delivery_price) : "",
  );
  const [priceAsPerSize, setPriceAsPerSize] = React.useState(
    !!item?.is_price_as_per_size,
  );
  const [taxInclusive, setTaxInclusive] = React.useState(!!item?.tax_inclusive);

  const [showDelivery, setShowDelivery] = React.useState(
    item ? item.show_on_delivery !== false : true,
  );
  const [showTakeaway, setShowTakeaway] = React.useState(
    item ? item.show_on_takeaway !== false : true,
  );
  const [showDineIn, setShowDineIn] = React.useState(
    item ? item.show_on_dine_in !== false : true,
  );
  const [isTop, setIsTop] = React.useState(!!item?.is_top);
  const [isAvailable, setIsAvailable] = React.useState(
    item ? item.is_available !== false : true,
  );
  const [visibilityConfig, setVisibilityConfig] = React.useState<unknown>(
    item?.visibility_config ?? null,
  );

  const [variants, setVariants] = React.useState<EditableVariant[]>(
    item?.variants ? item.variants.map((v) => ({ ...v })) : [],
  );
  const [groups, setGroups] = React.useState<ModifierGroup[]>(
    item?.addon_groups ? item.addon_groups.map((g) => ({ ...g })) : [],
  );
  const [tags, setTags] = React.useState<string[]>(item?.tags ?? []);
  const [imageUrl, setImageUrl] = React.useState(item?.image_url ?? "");

  React.useEffect(() => {
    if (userData?.id) fetchCategories(userData.id);
  }, [userData?.id, fetchCategories]);

  /* ------------------------------------------------------------ mutations */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Give the item a name");
      return;
    }
    if (!category) {
      toast.error("Pick a category");
      return;
    }
    const numericPrice = parseFloat(price);
    if (
      variants.length === 0 &&
      !priceAsPerSize &&
      (!price || Number.isNaN(numericPrice) || numericPrice < 0)
    ) {
      toast.error(
        "Set a base price, add options, or turn on 'Price as per Size'",
      );
      return;
    }
    for (const g of groups) {
      const named = g.name.trim();
      const hasOption = g.options.some((o) => o.name.trim());
      if (named && !hasOption) {
        toast.error(`Add at least one option to "${g.name}" or remove the group`);
        return;
      }
      if (!named && hasOption) {
        toast.error("Give every customization group a name");
        return;
      }
    }

    const cleanVariants = variants
      .filter((v) => v.name.trim())
      .map((v) => ({
        name: v.name.trim(),
        price: Number(v.price) || 0,
        ...(v.delivery_price != null ? { delivery_price: v.delivery_price } : {}),
      }));

    setSubmitting(true);
    try {
      if (isEdit && item) {
        const ok = await updateItem(item.id!, {
          name: name.trim(),
          name_secondary: nameSecondary.trim() || null,
          name_secondary_rtl: rtl,
          price: priceAsPerSize ? 0 : Number.isNaN(numericPrice) ? 0 : numericPrice,
          delivery_price:
            deliveryPrice !== "" ? parseFloat(deliveryPrice) : undefined,
          image_url: imageUrl,
          description,
          category,
          is_veg:
            foodType === "veg" ? true : foodType === "non" ? false : undefined,
          variants: cleanVariants,
          ...(!isPetpooja && {
            addon_groups: sanitizeModifierGroups(groups),
          }),
          tags,
          is_price_as_per_size: priceAsPerSize,
          is_top: isTop,
          show_on_delivery: showDelivery,
          show_on_takeaway: showTakeaway,
          show_on_dine_in: showDineIn,
          tax_inclusive: taxInclusive,
          is_available: isAvailable,
          // Hasura's jsonb scalar rejects an explicit null in a variable, and
          // because it rides one _set that would fail the WHOLE save. "No
          // schedule" is spelled { type: "default" }, never null.
          ...(visibilityConfig != null && { visibility_config: visibilityConfig }),
        });
        if (ok) onBack(item.id!);
      } else {
        const ok = await addItem({
          name: name.trim(),
          name_secondary: nameSecondary.trim() || null,
          name_secondary_rtl: rtl,
          price: Number.isNaN(numericPrice) ? 0 : numericPrice,
          image_url: imageUrl,
          description,
          category,
          is_veg:
            foodType === "veg" ? true : foodType === "non" ? false : undefined,
          variants: cleanVariants,
          addon_groups: sanitizeModifierGroups(groups),
          tags,
          is_available: true,
          is_top: isTop,
          is_price_as_per_size: priceAsPerSize,
          tax_inclusive: taxInclusive,
          delivery_price:
            deliveryPrice !== "" ? parseFloat(deliveryPrice) : undefined,
          show_on_delivery: showDelivery,
          show_on_takeaway: showTakeaway,
          show_on_dine_in: showDineIn,
        });
        if (ok) onBack();
      }
    } catch (error) {
      console.error("Failed to save item:", error);
      toast.error(isEdit ? "Failed to update item" : "Failed to add item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item?.id) return;
    if (
      !(await confirmDialog({
        title: "Delete this item?",
        description: "This action cannot be undone.",
        confirmText: "Delete",
        destructive: true,
      }))
    )
      return;
    try {
      await deleteItem(item.id);
      onBack();
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast.error("Failed to delete item");
    }
  };

  /* ------------------------------------------------------------- image io */

  const acceptLocalFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick a JPG or PNG image");
      return;
    }
    setImageUrl(URL.createObjectURL(file));
  };

  /* -------------------------------------------------------------- render */

  const headerSubtitle = isEdit
    ? [
        category ? formatDisplayName(category.name) : null,
        variants.length > 0 ? `${variants.length} variants` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Create a new menu item · it goes live once you add it";

  const mediaPanel = (
    <div className="flex flex-col gap-3.5">
      <FormCard className="p-4">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold leading-none text-zinc-950 dark:text-zinc-50">
            Item Image
          </span>
          {imageUrl && (
            <ChipButton
              tone="danger"
              className="ml-auto h-[30px]"
              onClick={() => setImageUrl("")}
            >
              <Trash2 size={13} strokeWidth={1.8} />
              Remove
            </ChipButton>
          )}
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setImageModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setImageModalOpen(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            acceptLocalFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "mt-3 flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-lg",
            imageUrl
              ? "border border-zinc-200 dark:border-zinc-700"
              : "flex-col gap-2 border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950",
          )}
        >
          {imageUrl ? (
            <Img
              src={imageUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <>
              <ImageIcon
                size={22}
                strokeWidth={1.6}
                className="text-zinc-400 dark:text-zinc-500"
              />
              <div className="text-[12.5px] font-medium text-zinc-600 dark:text-zinc-300">
                Drop an image, or browse
              </div>
              <div className="text-[11.5px] font-normal text-zinc-400 dark:text-zinc-500">
                JPG or PNG, square works best
              </div>
            </>
          )}
        </div>
        <div className="mt-2.5 flex gap-2">
          <ChipButton className="h-[30px]" onClick={() => setImageModalOpen(true)}>
            Search images
          </ChipButton>
          <ChipButton
            className="h-[30px]"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload
          </ChipButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => acceptLocalFile(e.target.files?.[0])}
          />
        </div>
      </FormCard>

      <FormCard className="p-4">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold leading-none text-zinc-950 dark:text-zinc-50">
            Tags
          </span>
          <ChipButton
            className="ml-auto h-[30px]"
            onClick={() => setTagsModalOpen(true)}
          >
            Manage
          </ChipButton>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.length === 0 && (
            <span className="text-[12.5px] italic text-zinc-500 dark:text-zinc-400">
              No tags selected
            </span>
          )}
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100"
              >
                <X size={11} strokeWidth={2.4} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setTagsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Plus size={11} strokeWidth={2.4} />
            Add tag
          </button>
        </div>
      </FormCard>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
      <SubViewHeader
        title={isEdit ? name || "Edit item" : "Add New Item"}
        translateTitle={!isEdit}
        subtitle={headerSubtitle}
        onBack={() => onBack()}
      >
        {isEdit && !isPetpooja && (
          <ChipButton tone="danger" className="h-9" onClick={handleDelete}>
            <Trash2 size={14} strokeWidth={1.8} />
            <span className="hidden sm:inline">Delete</span>
          </ChipButton>
        )}
        <ChipButton className="h-9" onClick={() => onBack()}>
          Cancel
        </ChipButton>
        <AdminV3Button
          type="submit"
          variant="primary"
          className="h-9"
          disabled={submitting}
        >
          <Save size={14} strokeWidth={2} />
          {isEdit ? "Save Changes" : "Add Item"}
        </AdminV3Button>
      </SubViewHeader>

      <div className="flex flex-nowrap items-start gap-5 px-0 pb-24 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        {/* Section rail. Below the design's wide breakpoint it also carries the
            Image & Tags step, because the right rail is not rendered there. */}
        <div className="sticky top-[76px] hidden w-[188px] shrink-0 flex-col gap-0.5 md:flex">
          <div className="px-[11px] pb-2 text-[10.5px] font-semibold uppercase leading-none tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
            Sections
          </div>
          {SECTIONS.filter((s) => s.key !== "media" || !wide).map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className={cn(
                "flex h-[34px] w-full items-center gap-2 rounded-md px-[11px] text-left text-[13px] leading-none transition-colors",
                effectiveSection === s.key
                  ? "bg-zinc-100 font-semibold text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                  : "bg-transparent font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5">
          {/* Section switcher for phones, where the rail has no room. */}
          <div className="-mx-0 flex gap-1.5 overflow-x-auto px-3.5 pb-0.5 md:hidden">
            {SECTIONS.filter((s) => s.key !== "media" || !wide).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={cn(
                  "h-8 shrink-0 whitespace-nowrap rounded-md px-3 text-[12.5px] font-medium leading-none transition-colors",
                  effectiveSection === s.key
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "border border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {effectiveSection === "details" && (
            <FormCard className="flex flex-col gap-4 p-[18px]">
              <FormCardHead
                title="Basic details"
                description={
                  isEdit
                    ? "Name, description and how this item is classified."
                    : "Start here — name, description and how this item is classified."
                }
              />
              {isPetpooja && (
                <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-[11px] dark:border-amber-900 dark:bg-amber-950">
                  <Info
                    size={15}
                    strokeWidth={1.8}
                    className="mt-px shrink-0 text-amber-600 dark:text-amber-400"
                  />
                  <div className="text-[12.5px] font-normal leading-[1.5] text-amber-800 dark:text-amber-300">
                    Name, category, price and variants are synced from Petpooja
                    and can&apos;t be edited here. You can still update the image,
                    description, tags and visibility.
                  </div>
                </div>
              )}

              <div>
                <V3Label htmlFor="v3-item-name">Item Name</V3Label>
                <V3Input
                  id="v3-item-name"
                  className="mt-1.5"
                  value={name}
                  disabled={isPetpooja}
                  translate="no"
                  placeholder="e.g. Onam Sadhya on Banana Leaf"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                  <V3Label htmlFor="v3-item-name2">
                    Secondary Name (optional)
                  </V3Label>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      Right-to-left (Arabic/Urdu)
                    </span>
                    <V3Toggle
                      checked={rtl}
                      onChange={setRtl}
                      label="Right-to-left secondary name"
                    />
                  </div>
                </div>
                <V3Input
                  id="v3-item-name2"
                  value={nameSecondary ?? ""}
                  translate="no"
                  dir={rtl ? "rtl" : "ltr"}
                  placeholder="Second-language name"
                  onChange={(e) => setNameSecondary(e.target.value)}
                />
                <V3Hint>
                  Shown on a second line below the item name. Turn on RTL for
                  Arabic/Urdu/Hebrew.
                </V3Hint>
              </div>

              <div>
                <V3Label htmlFor="v3-item-desc">Description</V3Label>
                <V3Textarea
                  id="v3-item-desc"
                  className="mt-1.5"
                  translate="no"
                  value={description}
                  placeholder="Describe the dish…"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-3.5">
                <div
                  className={cn(
                    "min-w-0 flex-[1_1_220px]",
                    isPetpooja && "pointer-events-none opacity-60",
                  )}
                >
                  <V3Label>Category</V3Label>
                  <div className="mt-1.5">
                    <CategoryDropdown
                      value={category?.name ?? ""}
                      onChange={(value, cat) => {
                        if (cat) {
                          setCategory({
                            id: cat.id,
                            name: cat.name,
                            priority: cat.priority ?? 0,
                            is_active: cat.is_active ?? true,
                            visibility_config: cat.visibility_config,
                          });
                          return;
                        }
                        const found = categories.find(
                          (c) =>
                            formatDisplayName(c.name) ===
                            formatDisplayName(value),
                        );
                        if (found) {
                          setCategory({
                            id: found.id,
                            name: found.name,
                            priority: found.priority ?? 0,
                            is_active: found.is_active ?? true,
                            visibility_config: found.visibility_config,
                          });
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-[1_1_200px]">
                  <V3Label>Food Type</V3Label>
                  <V3Segmented<FoodType>
                    className="mt-1.5"
                    value={foodType}
                    onChange={setFoodType}
                    options={[
                      {
                        value: "veg",
                        label: (
                          <>
                            <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-green-600" />
                            Veg
                          </>
                        ),
                      },
                      {
                        value: "non",
                        label: (
                          <>
                            <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-red-600" />
                            Non-veg
                          </>
                        ),
                      },
                      {
                        value: "other",
                        label: (
                          <>
                            <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-zinc-400" />
                            Other
                          </>
                        ),
                      },
                    ]}
                  />
                </div>
              </div>
            </FormCard>
          )}

          {effectiveSection === "pricing" && (
            <FormCard className="flex flex-col gap-4 p-[18px]">
              <FormCardHead
                title="Pricing"
                description="What customers pay, and how tax is handled."
              />
              <div className="flex flex-wrap gap-3.5">
                <div className="min-w-0 flex-[1_1_220px]">
                  <V3Label htmlFor="v3-item-price">
                    Base Price ({currency})
                  </V3Label>
                  <V3Input
                    id="v3-item-price"
                    className="mt-1.5"
                    type="number"
                    inputMode="decimal"
                    value={price}
                    placeholder="0.00"
                    disabled={isPetpooja || variants.length > 0}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  {variants.length > 0 && (
                    <V3Hint>Price is determined by the variants below.</V3Hint>
                  )}
                </div>
                <div className="min-w-0 flex-[1_1_220px]">
                  <V3Label htmlFor="v3-item-delprice">
                    Delivery Price ({currency})
                  </V3Label>
                  <V3Input
                    id="v3-item-delprice"
                    className="mt-1.5"
                    type="number"
                    inputMode="decimal"
                    value={deliveryPrice}
                    placeholder="Same as base price"
                    disabled={isPetpooja || variants.length > 0}
                    onChange={(e) => setDeliveryPrice(e.target.value)}
                  />
                  <V3Hint>
                    {variants.length > 0
                      ? "Set per variant below."
                      : "Used for hotel/delivery orders. Leave blank to use base price."}
                  </V3Hint>
                </div>
              </div>
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
                <ToggleRow
                  title="Price as per Size / Custom"
                  description="Prompt for price when adding to cart"
                  checked={priceAsPerSize}
                  disabled={isPetpooja}
                  onChange={setPriceAsPerSize}
                />
                <ToggleRow
                  title="Tax Inclusive"
                  description="Price already includes GST/VAT"
                  checked={taxInclusive}
                  onChange={setTaxInclusive}
                  last
                />
              </div>
            </FormCard>
          )}

          {effectiveSection === "visibility" && (
            <FormCard className="flex flex-col gap-4 p-[18px]">
              <FormCardHead
                title="Visibility"
                description="Where this item appears, and how it is promoted."
              />
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
                <ToggleRow
                  title="Show on Delivery"
                  description="Show this item on hotel/delivery pages"
                  checked={showDelivery}
                  onChange={setShowDelivery}
                />
                <ToggleRow
                  title="Show on Takeaway"
                  description="Show this item for takeaway orders"
                  checked={showTakeaway}
                  onChange={setShowTakeaway}
                />
                <ToggleRow
                  title="Show on Dine-in"
                  description="Show this item for dine-in orders"
                  checked={showDineIn}
                  onChange={setShowDineIn}
                />
                <ToggleRow
                  title="Top Dish / Bestseller"
                  description="Mark this item as a bestseller"
                  checked={isTop}
                  onChange={setIsTop}
                  last={!isEdit}
                />
                {/* Availability + schedule live here rather than only on the
                    separate Availability screen, so marking one item out of
                    stock never means leaving the item you were editing. */}
                {isEdit && (
                  <ToggleRow
                    title="Available"
                    description="Off marks it out of stock — it stays on the menu but can't be ordered."
                    checked={isAvailable}
                    onChange={setIsAvailable}
                    last
                  />
                )}
              </div>
              {isEdit && (
                <div>
                  <VisibilityEditor
                    value={visibilityConfig}
                    onChange={(next) => setVisibilityConfig(next)}
                  />
                  <V3Hint>
                    An item with no schedule of its own follows its
                    category&apos;s hours.
                  </V3Hint>
                </div>
              )}
            </FormCard>
          )}

          {effectiveSection === "variants" && (
            <FormCard className="flex flex-col gap-3.5 p-[18px]">
              <FormCardHead
                title="Variants / Options"
                description="Sizes or portions of the same dish, each with its own price."
                action={
                  !isPetpooja ? (
                    <ChipButton
                      onClick={() =>
                        setVariants((prev) => [...prev, { name: "", price: 0 }])
                      }
                    >
                      <Plus size={13} strokeWidth={2.2} />
                      Add Option
                    </ChipButton>
                  ) : undefined
                }
              />
              {variants.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
                  <div className="text-[13.5px] font-medium text-zinc-600 dark:text-zinc-300">
                    No variants added.
                  </div>
                  <div className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                    Add sizes or portions like half and full, each with its own
                    price.
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
                  {variants.map((v, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex flex-wrap items-center gap-2.5 px-3.5 py-3",
                        i < variants.length - 1 &&
                          "border-b border-zinc-100 dark:border-zinc-800",
                      )}
                    >
                      <V3Input
                        className="h-[34px] flex-[1_1_160px] text-[13px] font-medium"
                        translate="no"
                        placeholder="Option name"
                        value={v.name}
                        disabled={isPetpooja}
                        onChange={(e) =>
                          setVariants((prev) =>
                            prev.map((x, xi) =>
                              xi === i ? { ...x, name: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      <V3PriceInput
                        prefix={currency}
                        disabled={isPetpooja}
                        value={String(v.price ?? "")}
                        onChange={(val) =>
                          setVariants((prev) =>
                            prev.map((x, xi) =>
                              xi === i
                                ? { ...x, price: parseFloat(val) || 0 }
                                : x,
                            ),
                          )
                        }
                      />
                      <V3PriceInput
                        prefix={`Del ${currency}`}
                        disabled={isPetpooja}
                        placeholder="—"
                        width="w-[76px]"
                        value={
                          v.delivery_price != null ? String(v.delivery_price) : ""
                        }
                        onChange={(val) =>
                          setVariants((prev) =>
                            prev.map((x, xi) =>
                              xi === i
                                ? {
                                    ...x,
                                    delivery_price:
                                      val === "" ? undefined : parseFloat(val) || 0,
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                      {!isPetpooja && (
                        <GhostIconButton
                          title="Remove option"
                          onClick={() =>
                            setVariants((prev) =>
                              prev.filter((_, xi) => xi !== i),
                            )
                          }
                        >
                          <Trash2 size={15} strokeWidth={1.7} />
                        </GhostIconButton>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </FormCard>
          )}

          {effectiveSection === "custom" && (
            <FormCard className="flex flex-col gap-3.5 p-[18px]">
              <FormCardHead
                title="Customizations"
                description="Let customers choose base, toppings and extras. Option prices are added on top of the item price."
                action={
                  !isPetpooja ? (
                    <ChipButton
                      onClick={() =>
                        setGroups((prev) => [...prev, createEmptyGroup()])
                      }
                    >
                      <Plus size={13} strokeWidth={2.2} />
                      Add Group
                    </ChipButton>
                  ) : undefined
                }
              />
              {groups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
                  <div className="text-[13.5px] font-medium text-zinc-600 dark:text-zinc-300">
                    No customizations added.
                  </div>
                  <div className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                    Groups let customers pick add-ons; option prices stack on the
                    item price.
                  </div>
                </div>
              ) : (
                groups.map((group, gi) => {
                  const patch = (p: Partial<ModifierGroup>) =>
                    setGroups((prev) =>
                      prev.map((g, i) => (i === gi ? { ...g, ...p } : g)),
                    );
                  const single = group.max === 1;
                  return (
                    <div
                      key={group.id}
                      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3.5 dark:border-zinc-700"
                    >
                      <div className="flex items-center gap-2.5">
                        <V3Input
                          translate="no"
                          className="flex-1 text-[13.5px] font-medium"
                          placeholder="Group name (e.g. Choose your base)"
                          value={group.name}
                          disabled={isPetpooja}
                          onChange={(e) => patch({ name: e.target.value })}
                        />
                        {!isPetpooja && (
                          <GhostIconButton
                            tone="danger"
                            title="Remove group"
                            onClick={() =>
                              setGroups((prev) =>
                                prev.filter((_, i) => i !== gi),
                              )
                            }
                          >
                            <Trash2 size={15} strokeWidth={1.7} />
                          </GhostIconButton>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <V3Segmented
                          className="w-[236px] shrink-0"
                          disabled={isPetpooja}
                          value={single ? "single" : "multi"}
                          onChange={(v) =>
                            v === "single"
                              ? patch({ max: 1, min: Math.min(group.min, 1) })
                              : patch({
                                  max: Math.max(2, group.options.length),
                                })
                          }
                          options={[
                            { value: "single", label: "Single choice" },
                            { value: "multi", label: "Multiple" },
                          ]}
                        />
                        <div className="flex items-center gap-2">
                          <V3Toggle
                            checked={group.min >= 1}
                            disabled={isPetpooja}
                            label="Required"
                            onChange={(c) => patch({ min: c ? 1 : 0 })}
                          />
                          <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                            Required
                          </span>
                        </div>
                        <span className="ml-auto whitespace-nowrap text-xs font-normal text-zinc-500 dark:text-zinc-400">
                          {group.min >= 1 ? "Required" : "Optional"} ·{" "}
                          {single ? "choose 1" : `choose up to ${group.max}`}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {group.options.map((opt, oi) => (
                          <div
                            key={opt.id}
                            className="flex flex-wrap items-center gap-2.5"
                          >
                            <button
                              type="button"
                              disabled={isPetpooja}
                              aria-label={`Make ${opt.name || "option"} the default`}
                              onClick={() =>
                                patch({
                                  options: group.options.map((o, i) =>
                                    single
                                      ? { ...o, is_default: i === oi }
                                      : i === oi
                                        ? { ...o, is_default: !o.is_default }
                                        : o,
                                  ),
                                })
                              }
                              className={cn(
                                "h-4 w-4 shrink-0 border-[1.5px]",
                                single ? "rounded-full" : "rounded-[4px]",
                                opt.is_default
                                  ? "border-zinc-900 bg-zinc-900 dark:border-zinc-50 dark:bg-zinc-50"
                                  : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800",
                              )}
                            />
                            <V3Input
                              translate="no"
                              className="h-[34px] flex-[1_1_140px] text-[13px]"
                              placeholder="Option name"
                              value={opt.name}
                              disabled={isPetpooja}
                              onChange={(e) =>
                                patch({
                                  options: group.options.map((o, i) =>
                                    i === oi ? { ...o, name: e.target.value } : o,
                                  ),
                                })
                              }
                            />
                            <V3PriceInput
                              prefix={`+${currency}`}
                              width="w-[72px]"
                              disabled={isPetpooja}
                              value={String(opt.price ?? 0)}
                              onChange={(val) =>
                                patch({
                                  options: group.options.map((o, i) =>
                                    i === oi
                                      ? { ...o, price: parseFloat(val) || 0 }
                                      : o,
                                  ),
                                })
                              }
                            />
                            {!isPetpooja && (
                              <GhostIconButton
                                title="Remove option"
                                onClick={() =>
                                  patch({
                                    options: group.options.filter(
                                      (_, i) => i !== oi,
                                    ),
                                  })
                                }
                              >
                                <Trash2 size={15} strokeWidth={1.7} />
                              </GhostIconButton>
                            )}
                          </div>
                        ))}
                        {!isPetpooja && (
                          <button
                            type="button"
                            onClick={() =>
                              patch({
                                options: [...group.options, createEmptyOption()],
                              })
                            }
                            className="inline-flex h-8 items-center gap-1.5 self-start rounded-md border border-dashed border-zinc-300 px-2.5 text-[12.5px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            <Plus size={12} strokeWidth={2.2} />
                            Add option
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </FormCard>
          )}

          {effectiveSection === "media" && !wide && mediaPanel}
        </div>

        {wide && (
          <div className="sticky top-[76px] w-[288px] shrink-0">{mediaPanel}</div>
        )}
      </div>

      <ImageGridModalV2
        isOpen={imageModalOpen}
        onOpenChange={setImageModalOpen}
        itemName={name}
        category={category?.name ?? ""}
        currentImage={imageUrl}
        onSelectImage={(url: string) => {
          setImageUrl(url);
          setImageModalOpen(false);
        }}
      />

      {tagsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="text-[15px] font-semibold text-zinc-950 dark:text-zinc-50">
                Manage Tags
              </h3>
              <GhostIconButton
                title="Close"
                onClick={() => setTagsModalOpen(false)}
              >
                <X size={16} strokeWidth={2} />
              </GhostIconButton>
            </div>
            <div className="flex flex-col gap-5 overflow-y-auto p-5">
              {TAG_CATEGORIES.map((group) => (
                <div key={group.name}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {group.name}
                  </h4>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {group.tags.map((tag) => {
                      const on = tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            setTags((prev) =>
                              on
                                ? prev.filter((t) => t !== tag)
                                : [...prev, tag],
                            )
                          }
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                            on
                              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                          )}
                        >
                          {on && <Check size={12} strokeWidth={2.6} />}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end border-t border-zinc-200 p-4 dark:border-zinc-800">
              <AdminV3Button
                variant="primary"
                onClick={() => setTagsModalOpen(false)}
              >
                Done <CountPill className="ml-1">{tags.length}</CountPill>
              </AdminV3Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
