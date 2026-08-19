"use client";

import * as React from "react";
import {
  ImageIcon,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import Img from "@/components/Img";
import { ImageGridModalV2 } from "@/components/bulkMenuUpload/ImageGridModalV2";
import { fillOneItemFromGoogle } from "@/app/actions/googleImageFallback";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { extractMenuFromFiles } from "@/lib/menu/menuExtraction";
import { runPool } from "@/lib/runPool";
import { cn } from "@/lib/utils";
import { Partner, useAuthStore } from "@/store/authStore";
import { useCategoryStore } from "@/store/categoryStore_hasura";
import { useMenuStore } from "@/store/menuStore_hasura";
import { AdminV3Button } from "../ui/primitives";
import {
  ChipButton,
  FormCard,
  GhostIconButton,
  SubViewHeader,
  V3Input,
  V3Label,
  V3PriceInput,
  V3Toggle,
} from "./formKit";

type DraftItem = {
  id: string;
  name: string;
  price: string;
  description: string;
  image_url: string;
  variants: { name: string; price: number }[];
};

const emptyRow = (): DraftItem => ({
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Math.random()),
  name: "",
  price: "",
  description: "",
  image_url: "",
  variants: [],
});

export function AddCategoryView({ onBack }: { onBack: () => void }) {
  const { addItem } = useMenuStore();
  const { addCategory, updateCategory } = useCategoryStore();
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;
  const currency = partner?.currency || "₹";

  const [categoryName, setCategoryName] = React.useState("");
  const [live, setLive] = React.useState(true);
  const [rows, setRows] = React.useState<DraftItem[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [progress, setProgress] = React.useState({ current: 0, total: 0 });

  const [showUpload, setShowUpload] = React.useState(false);
  const [extracting, setExtracting] = React.useState(false);
  const [fetchingImages, setFetchingImages] = React.useState(false);
  const [imagesDone, setImagesDone] = React.useState(0);
  const [imageRowId, setImageRowId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const missingImages = rows.filter((r) => !r.image_url).length;
  const canSave = !!categoryName.trim() && rows.some((r) => r.name.trim());

  const patchRow = (id: string, patch: Partial<DraftItem>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  /* ------------------------------------------------------ AI extraction */

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setExtracting(true);
    const toastId = toast.loading("Preparing your menu pages…");
    try {
      const result = await extractMenuFromFiles(list, {
        model: "gemini-2.5-flash",
        onProgress: (p) => {
          toast.loading(
            p.phase === "rendering"
              ? `Reading your menu… (${p.pagesReady} page${p.pagesReady === 1 ? "" : "s"})`
              : `Extracting items… (batch ${Math.min(p.batchesDone + 1, p.totalBatches)}/${p.totalBatches})`,
            { id: toastId },
          );
        },
      });
      toast.dismiss(toastId);
      if (result.items.length === 0) {
        toast.error(
          result.failedBatches > 0
            ? "Couldn't read your menu. Please try clearer images."
            : "No menu items found in the uploaded pages.",
        );
        return;
      }
      setRows((prev) => [
        ...prev,
        ...result.items.map((it) => ({
          ...emptyRow(),
          name: it.name || "",
          price: it.price ? String(it.price) : "",
          description: it.description || "",
          variants: it.variants || [],
        })),
      ]);
      // The extractor also reports a category per item; this screen is creating
      // ONE category, so the name is seeded from the first extracted group only
      // when the partner hasn't typed one yet.
      if (!categoryName.trim() && result.items[0]?.category) {
        setCategoryName(result.items[0].category);
      }
      setShowUpload(false);
      toast.success(
        `Extracted ${result.items.length} item${result.items.length === 1 ? "" : "s"} from ${result.totalPages} page${result.totalPages === 1 ? "" : "s"}${
          result.failedBatches > 0 ? " — some pages couldn't be read" : ""
        }`,
      );
    } catch (error) {
      toast.dismiss(toastId);
      console.error("Menu extraction error:", error);
      toast.error("Failed to extract menu. Please try again.");
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* --------------------------------------------------------- get images */

  const handleGetImages = async () => {
    const without = rows.filter((r) => !r.image_url && r.name.trim());
    if (without.length === 0) {
      toast.info("Every item already has an image.");
      return;
    }
    setFetchingImages(true);
    setImagesDone(0);
    let done = 0;
    const bump = (n = 1) => {
      done += n;
      setImagesDone(done);
    };

    try {
      const uniqueNames = Array.from(new Set(without.map((r) => r.name.trim())));
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

      const bankCount = without.filter((r) =>
        urlByName.has(r.name.trim().toLowerCase()),
      ).length;
      if (bankCount > 0) {
        setRows((prev) =>
          prev.map((r) => {
            if (r.image_url) return r;
            const url = urlByName.get(r.name.trim().toLowerCase());
            return url ? { ...r, image_url: url } : r;
          }),
        );
        bump(bankCount);
      }

      const missNames = Array.from(
        new Set(
          without
            .filter((r) => !urlByName.has(r.name.trim().toLowerCase()))
            .map((r) => r.name.trim()),
        ),
      );
      let googleFound = 0;
      const partnerId = userData?.id;
      if (missNames.length > 0 && partnerId) {
        const partnerName =
          partner?.name?.trim() || partner?.store_name?.trim() || "Partner";
        await runPool(missNames, 6, async (name) => {
          const lname = name.toLowerCase();
          const affected = without.filter(
            (r) => r.name.trim().toLowerCase() === lname,
          ).length;
          const r = await fillOneItemFromGoogle(partnerId, partnerName, {
            name,
            category_name: categoryName || null,
          });
          if (r?.image_url) {
            googleFound += affected;
            setRows((prev) =>
              prev.map((row) =>
                !row.image_url && row.name.trim().toLowerCase() === lname
                  ? { ...row, image_url: r.image_url }
                  : row,
              ),
            );
          }
          bump(affected);
        });
      }

      const found = bankCount + googleFound;
      if (found > 0)
        toast.success(`Added images to ${found} item${found === 1 ? "" : "s"}`);
      const notFound = without.length - found;
      if (notFound > 0)
        toast.info(
          `${notFound} item${notFound === 1 ? "" : "s"} had no image found`,
        );
    } catch (error) {
      console.error("Get images failed:", error);
      toast.error("Failed to fetch images.");
    } finally {
      setFetchingImages(false);
    }
  };

  /* ---------------------------------------------------------- save flow */

  const handleSave = async () => {
    const usable = rows.filter((r) => r.name.trim());
    if (!categoryName.trim()) {
      toast.error("Give the category a name");
      return;
    }
    if (usable.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    setSaving(true);
    setProgress({ current: 0, total: usable.length });
    try {
      const category = await addCategory(categoryName.trim(), userData?.id);
      if (!category) {
        toast.error("Failed to create category");
        return;
      }

      let ok = 0;
      for (let i = 0; i < usable.length; i++) {
        const row = usable[i];
        setProgress({ current: i + 1, total: usable.length });
        try {
          await addItem({
            name: row.name.trim(),
            price:
              row.variants.length > 0 ? 0 : parseFloat(row.price) || 0,
            image_url: row.image_url,
            description: row.description,
            category: {
              id: category.id,
              name: category.name,
              priority: category.priority || 0,
              is_active: live,
            },
            variants: row.variants,
            tags: [],
            is_available: true,
          });
          ok++;
        } catch (error) {
          console.error(`Failed to save item ${row.name}:`, error);
        }
      }

      // The design's "Show on menu" switch — a category is created active, so
      // only an explicit "off" needs a follow-up write.
      if (!live) {
        try {
          await updateCategory({
            id: category.id,
            name: category.name,
            priority: category.priority ?? 0,
            is_active: false,
          });
        } catch (error) {
          console.error("Failed to hide the new category:", error);
        }
      }

      toast.success(
        ok === usable.length
          ? `Category created with ${ok} item${ok === 1 ? "" : "s"}`
          : `Saved ${ok}/${usable.length} items — ${usable.length - ok} failed`,
      );
      onBack();
    } catch (error) {
      console.error("Failed to save category:", error);
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------------- render */

  const saveLabel = saving
    ? `Saving ${progress.current}/${progress.total}…`
    : rows.filter((r) => r.name.trim()).length > 0
      ? `Save Category (${rows.filter((r) => r.name.trim()).length})`
      : "Save Category";

  const imageRow = rows.find((r) => r.id === imageRowId) || null;

  return (
    <div className="flex flex-col">
      <SubViewHeader
        title="Add New Category"
        subtitle="Create a category with menu items"
        onBack={onBack}
      >
        <ChipButton className="h-9" onClick={onBack} disabled={saving}>
          Cancel
        </ChipButton>
        <AdminV3Button
          variant="primary"
          className="h-9"
          disabled={!canSave || saving}
          onClick={handleSave}
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} strokeWidth={2} />
          )}
          {saveLabel}
        </AdminV3Button>
      </SubViewHeader>

      <div className="flex w-full max-w-[1040px] flex-col gap-3.5 pb-24 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        <FormCard className="flex flex-wrap items-end gap-3.5 p-[18px]">
          <div className="min-w-0 flex-[1_1_260px]">
            <V3Label htmlFor="v3-cat-name">Category Name</V3Label>
            <V3Input
              id="v3-cat-name"
              className="mt-1.5"
              translate="no"
              value={categoryName}
              placeholder="e.g. Starters, Main Course, Beverages"
              onChange={(e) => setCategoryName(e.target.value)}
            />
          </div>
          <div className="flex h-9 shrink-0 items-center gap-2.5">
            <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
              Show on menu
            </span>
            <V3Toggle checked={live} onChange={setLive} label="Show on menu" />
          </div>
        </FormCard>

        <FormCard className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2.5 gap-y-2.5 border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-800">
            <div className="min-w-0 flex-[1_1_160px]">
              <div className="text-[14.5px] font-semibold leading-tight tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                Items {rows.length > 0 ? `(${rows.length})` : ""}
              </div>
              <div className="mt-0.5 text-xs font-normal leading-tight text-zinc-500 dark:text-zinc-400">
                Add them one by one, or let AI read them off a photo of your
                menu.
              </div>
            </div>
            <ChipButton
              className="h-8"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
            >
              <Plus size={13} strokeWidth={2.2} />
              Add item
            </ChipButton>
            <ChipButton
              className="h-8"
              onClick={() => setShowUpload((v) => !v)}
            >
              <Sparkles size={13} strokeWidth={1.8} />
              Menu upload
            </ChipButton>
          </div>

          {showUpload && (
            <div className="m-4 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-600 dark:bg-zinc-950">
              <div className="min-w-0 flex-[1_1_220px]">
                <div className="flex items-center gap-2">
                  <Sparkles
                    size={15}
                    strokeWidth={1.8}
                    className="text-zinc-500 dark:text-zinc-400"
                  />
                  <span className="text-[13px] font-medium text-zinc-950 dark:text-zinc-50">
                    Menu upload
                  </span>
                </div>
                <div className="mt-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  Upload images or a PDF of your menu and AI will extract the
                  items automatically.
                </div>
              </div>
              <ChipButton
                disabled={extracting}
                onClick={() => fileInputRef.current?.click()}
              >
                {extracting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Upload size={13} strokeWidth={1.8} />
                )}
                {extracting ? "Reading…" : "Upload images"}
              </ChipButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <GhostIconButton
                size={30}
                title="Close menu upload"
                onClick={() => setShowUpload(false)}
              >
                <X size={15} strokeWidth={2} />
              </GhostIconButton>
            </div>
          )}

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2.5 px-5 py-11">
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] border border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500">
                <ImageIcon size={18} strokeWidth={1.6} />
              </div>
              <div className="text-[13.5px] font-medium text-zinc-700 dark:text-zinc-300">
                No items yet
              </div>
              <div className="max-w-[340px] text-center text-[12.5px] font-normal text-zinc-500 dark:text-zinc-400">
                Add items manually, or extract them from a photo of your printed
                menu.
              </div>
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                <AdminV3Button
                  variant="primary"
                  className="h-9"
                  onClick={() => setRows([emptyRow()])}
                >
                  <Plus size={14} strokeWidth={2.2} />
                  Add item manually
                </AdminV3Button>
                <ChipButton
                  className="h-9"
                  onClick={() => setShowUpload(true)}
                >
                  <Sparkles size={13} strokeWidth={1.8} />
                  Menu upload
                </ChipButton>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2.5 border-b border-zinc-100 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  Fill in name and price — description is optional.
                </span>
                <ChipButton
                  className="ml-auto h-[30px]"
                  disabled={fetchingImages || missingImages === 0}
                  onClick={handleGetImages}
                >
                  {fetchingImages ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      {imagesDone}/{missingImages}
                    </>
                  ) : (
                    <>
                      <ImagePlus size={13} strokeWidth={1.8} />
                      Get images ({missingImages})
                    </>
                  )}
                </ChipButton>
              </div>

              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center gap-2.5 gap-y-2.5 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800"
                >
                  <button
                    type="button"
                    title="Pick an image"
                    onClick={() => setImageRowId(row.id)}
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border",
                      row.image_url
                        ? "border-zinc-200 dark:border-zinc-700"
                        : "border-zinc-200 bg-zinc-100 text-zinc-400 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-700",
                    )}
                  >
                    {row.image_url ? (
                      <Img
                        src={row.image_url}
                        alt={row.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlus size={15} strokeWidth={1.7} />
                    )}
                  </button>
                  <V3Input
                    className="h-[34px] flex-[1_1_130px] text-[13px]"
                    translate="no"
                    placeholder="Item name"
                    value={row.name}
                    onChange={(e) => patchRow(row.id, { name: e.target.value })}
                  />
                  <V3PriceInput
                    prefix={currency}
                    width="w-[82px]"
                    placeholder="0"
                    disabled={row.variants.length > 0}
                    value={row.price}
                    onChange={(v) => patchRow(row.id, { price: v })}
                  />
                  <V3Input
                    className="h-[34px] flex-[1_1_150px] text-[13px]"
                    translate="no"
                    placeholder="Description (optional)"
                    value={row.description}
                    onChange={(e) =>
                      patchRow(row.id, { description: e.target.value })
                    }
                  />
                  <GhostIconButton
                    tone="danger"
                    title="Remove item"
                    onClick={() =>
                      setRows((prev) => prev.filter((r) => r.id !== row.id))
                    }
                  >
                    <Trash2 size={15} strokeWidth={1.7} />
                  </GhostIconButton>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, emptyRow()])}
                className="flex h-10 w-full items-center gap-2 border-t border-zinc-100 bg-white px-4 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Plus size={14} strokeWidth={2.2} />
                Add another item
              </button>
            </>
          )}
        </FormCard>
      </div>

      <ImageGridModalV2
        isOpen={!!imageRow}
        onOpenChange={(open) => {
          if (!open) setImageRowId(null);
        }}
        itemName={imageRow?.name || ""}
        category={categoryName}
        currentImage={imageRow?.image_url || ""}
        onSelectImage={(url: string) => {
          if (imageRowId) patchRow(imageRowId, { image_url: url });
          setImageRowId(null);
        }}
      />
    </div>
  );
}
