"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  AlertCircle,
  FileText,
  FileUp,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { searchMenuItemImages } from "@/app/actions/televeryItemImages";
import { ImageGridModalV2 } from "@/components/bulkMenuUpload/ImageGridModalV2";
import Img from "@/components/Img";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  extractMenuFromFiles,
  type ExtractProgress,
} from "@/lib/menu/menuExtraction";
import {
  blobUrlToDataUrl,
  isLocalImage,
  nextItemKey,
  type DraftItem,
} from "./types";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB, same cap as the public signup
/** How many items the bulk image fill will look up (it's one call per item). */
const BULK_IMAGE_CAP = 10;

/**
 * Step 4 — the menu.
 *
 * Extraction runs in the BROWSER (menuExtraction is a "use client" module: it
 * rasterises PDFs with pdfjs and images with canvas), so the operator uploads
 * here, the items land in local state, and only the finished JSON is shipped to
 * the server action.
 */
export function StepMenu({
  items,
  disabled,
  onItemsChange,
  onMediaLibraryOpenChange,
}: {
  items: DraftItem[];
  disabled: boolean;
  /**
   * A setState, deliberately — every write here goes through the updater form.
   * The image upload and the bulk fill both await while the rest of the form
   * stays editable, so writing a captured snapshot back would silently discard
   * whatever the operator typed or added in the meantime.
   */
  onItemsChange: Dispatch<SetStateAction<DraftItem[]>>;
  /**
   * The media library is a portalled dialog the panel has to duck under — see
   * the z-index comment in AddRestaurantPanel.
   */
  onMediaLibraryOpenChange: (open: boolean) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [oversized, setOversized] = useState<File[]>([]);
  const [instruction, setInstruction] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState<ExtractProgress | null>(null);
  const [imageTarget, setImageTarget] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [bulkFilling, setBulkFilling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetItem = items.find((i) => i.key === imageTarget) || null;

  const openMediaLibrary = (key: string) => {
    setImageTarget(key);
    onMediaLibraryOpenChange(true);
  };
  const closeMediaLibrary = () => {
    setImageTarget(null);
    onMediaLibraryOpenChange(false);
  };

  const patchItem = (key: string, patch: Partial<DraftItem>) =>
    onItemsChange((prev) =>
      prev.map((i) => (i.key === key ? { ...i, ...patch } : i)),
    );

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const accepted: File[] = [];
    const rejected: File[] = [];
    Array.from(list).forEach((f) =>
      (f.size > MAX_FILE_SIZE ? rejected : accepted).push(f),
    );
    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
    if (rejected.length) setOversized((prev) => [...prev, ...rejected]);
    // Let the same file be re-picked after a removal.
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runExtraction = async () => {
    if (!files.length) return;
    setExtracting(true);
    setProgress(null);
    try {
      const result = await extractMenuFromFiles(files, {
        model: "gemini-2.5-flash",
        extraContext: instruction.trim() || undefined,
        onProgress: setProgress,
      });
      if (!result.items.length) {
        toast.error(
          "We couldn't read that menu. Try clearer files, or add items by hand.",
        );
        return;
      }
      // Append rather than replace, so a second upload (e.g. the drinks card)
      // adds to what's already there — and to whatever was edited while the
      // extraction was running.
      onItemsChange((prev) => [
        ...prev,
        ...result.items.map((i) => ({
          key: nextItemKey(),
          name: i.name,
          price: Number(i.price) || 0,
          description: i.description || "",
          category: i.category || "Menu",
          image_url: "",
          variants: i.variants,
        })),
      ]);
      setFiles([]);
      toast.success(`Read ${result.items.length} items from the menu`);
    } catch (err) {
      console.error("menu extraction failed", err);
      toast.error("Menu extraction failed. Please try again.");
    } finally {
      setExtracting(false);
      setProgress(null);
    }
  };

  /**
   * ImageGridModalV2's Upload/Paste tabs return a `blob:` URL that only exists
   * in this tab, so anything local is pushed to S3 before it's stored. Remote
   * picks (image bank / Google) are kept as-is, the same as the admin item
   * editor does.
   */
  const handleImagePicked = async (key: string, url: string) => {
    closeMediaLibrary();
    if (!isLocalImage(url)) {
      patchItem(key, { image_url: url });
      return;
    }
    setUploadingKey(key);
    try {
      const dataUrl = url.startsWith("blob:") ? await blobUrlToDataUrl(url) : url;
      const uploaded = await uploadFileToS3(
        dataUrl,
        `menu/televery_${Date.now()}.jpg`,
      );
      patchItem(key, { image_url: uploaded as string });
    } catch (err) {
      console.error("item image upload failed", err);
      toast.error("Could not upload that image");
    } finally {
      setUploadingKey(null);
    }
  };

  /**
   * Bulk image fill, capped at 10 items.
   *
   * Goes through Apify (a server action — the token is server-only), sent as ONE
   * batched call for the whole menu rather than the previous request-per-item
   * loop against images.cravings.live. That endpoint stopped responding
   * altogether (it accepts the connection and never replies) and the calls had
   * no timeout, so this button parked on a spinner forever with no error.
   *
   * The URLs are remote Google results and can expire, which is why this stays
   * an explicit opt-in rather than something we run automatically.
   */
  const bulkFillImages = async () => {
    const targets = items.filter((i) => !i.image_url).slice(0, BULK_IMAGE_CAP);
    if (!targets.length) return;
    setBulkFilling(true);
    const found = new Map<string, string>();
    let filled = 0;
    // Same query shape as before: append the category unless the name already
    // carries it, so "Biriyani" in a "Chicken" category still searches sensibly.
    const queryFor = (i: DraftItem) =>
      (i.category && !i.name.includes(i.category)
        ? `${i.name} ${i.category}`
        : i.name
      ).trim();
    try {
      const byQuery = await searchMenuItemImages(targets.map(queryFor));
      for (const item of targets) {
        const url = byQuery[queryFor(item)];
        if (url) {
          found.set(item.key, url);
          filled += 1;
        }
      }
    } catch (err) {
      console.error("bulk image fill failed", err);
      setBulkFilling(false);
      toast.error("Image search is unavailable right now — add images manually.");
      return;
    }

    // One state write at the end, against the LATEST list rather than the
    // snapshot this run started from — items added or edited while the lookups
    // ran must survive (matching is by key, so deleted ones simply drop out).
    onItemsChange((prev) =>
      prev.map((i) =>
        found.has(i.key) ? { ...i, image_url: found.get(i.key)! } : i,
      ),
    );
    setBulkFilling(false);
    if (filled) {
      // Say how many missed, so a partial result isn't mistaken for a full one.
      toast.success(
        `Found ${filled} image${filled === 1 ? "" : "s"}` +
          (filled < targets.length ? ` — ${targets.length - filled} had no match` : ""),
      );
    } else {
      toast.error("No images found for these items");
    }
  };

  const busy = disabled || extracting || bulkFilling;

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        id="tv-menu-files"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {files.length === 0 && oversized.length === 0 ? (
        <label
          htmlFor="tv-menu-files"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input px-3.5 py-3 transition hover:border-orange-600/40 hover:bg-orange-50/50 dark:hover:bg-orange-900/10"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
            <FileUp className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">
              Upload the menu{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              PNG, JPG or multi-page PDF — we&apos;ll digitise every page.
            </span>
          </span>
        </label>
      ) : (
        <div
          className="space-y-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
        >
          {files.map((f, idx) => (
            <div
              key={`${f.name}-${idx}`}
              className="flex items-center gap-3 rounded-xl border border-input px-3.5 py-2.5"
            >
              <FileText className="h-4 w-4 shrink-0 text-orange-600" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {f.name}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {(f.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </span>
              <button
                type="button"
                onClick={() => setFiles((p) => p.filter((_, i) => i !== idx))}
                disabled={busy}
                className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-40"
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {oversized.map((f, idx) => (
            <div
              key={`big-${f.name}-${idx}`}
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 dark:border-red-900/40 dark:bg-red-900/15"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span className="min-w-0 flex-1 text-[11px] text-red-600 dark:text-red-400">
                <span className="block truncate font-medium">{f.name}</span>
                {(f.size / 1024 / 1024).toFixed(1)} MB — over the 50MB limit
              </span>
              <button
                type="button"
                onClick={() => setOversized((p) => p.filter((_, i) => i !== idx))}
                className="shrink-0 text-red-400 hover:text-red-600"
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <label
            htmlFor="tv-menu-files"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-input px-3.5 py-2 text-[13px] font-medium text-orange-600 transition hover:border-orange-600/40"
          >
            <FileUp className="h-4 w-4" /> Add another file
          </label>
        </div>
      )}

      {files.length > 0 && (
        <>
          <div className="space-y-2">
            <Label
              htmlFor="tv-menu-instruction"
              className="flex items-center gap-1.5 text-[13px]"
            >
              <Sparkles className="h-3.5 w-3.5 text-orange-600" />
              Instruction for the AI (optional)
            </Label>
            <textarea
              id="tv-menu-instruction"
              rows={2}
              maxLength={1000}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Ignore the drinks section; prices are in ₹"
              disabled={busy}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </div>
          <Button
            type="button"
            onClick={runExtraction}
            disabled={busy}
            className="w-full bg-orange-600 text-white hover:bg-orange-700"
          >
            {extracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {progress?.phase === "extracting"
                  ? `Reading… ${progress.batchesDone}/${progress.totalBatches}`
                  : progress
                    ? `Preparing pages… ${progress.pagesReady}`
                    : "Starting…"}
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" /> Digitise the menu
              </>
            )}
          </Button>
        </>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-sm font-semibold text-foreground">
          {items.length} item{items.length === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          {items.some((i) => !i.image_url) && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={bulkFillImages}
            >
              {bulkFilling ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
              )}
              Auto-fill images
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              onItemsChange((prev) => [
                ...prev,
                {
                  key: nextItemKey(),
                  name: "",
                  price: 0,
                  description: "",
                  category: prev[prev.length - 1]?.category || "Menu",
                  image_url: "",
                },
              ])
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add item
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-input px-3 py-6 text-center text-[11px] text-muted-foreground">
          No items yet. Upload a menu above or add them one by one — you can also
          leave this empty and add the menu later from the restaurant&apos;s own
          dashboard.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-start gap-2.5 rounded-xl border border-input p-2.5"
            >
              <button
                type="button"
                onClick={() => openMediaLibrary(item.key)}
                disabled={busy || uploadingKey === item.key}
                className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-input bg-muted transition hover:border-orange-600/50 disabled:opacity-50"
                aria-label={`Set an image for ${item.name || "this item"}`}
              >
                {uploadingKey === item.key ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : item.image_url ? (
                  <Img
                    src={item.image_url}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {/* Labels are persistent, not placeholders. Extraction fills every
                  field the moment the menu is parsed, so placeholder-only fields
                  are blank-labelled in practice — and "Chicken" in the second box
                  is impossible to read as a category rather than a description. */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="space-y-0.5">
                  <label
                    htmlFor={`item-name-${item.key}`}
                    className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Item name
                  </label>
                  <Input
                    id={`item-name-${item.key}`}
                    value={item.name}
                    onChange={(e) => patchItem(item.key, { name: e.target.value })}
                    placeholder="e.g. Chicken Biriyani"
                    disabled={busy}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex gap-1.5">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <label
                      htmlFor={`item-cat-${item.key}`}
                      className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Category
                    </label>
                    <Input
                      id={`item-cat-${item.key}`}
                      value={item.category}
                      onChange={(e) =>
                        patchItem(item.key, { category: e.target.value })
                      }
                      placeholder="e.g. Main course"
                      disabled={busy}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="w-24 shrink-0 space-y-0.5">
                    <label
                      htmlFor={`item-price-${item.key}`}
                      className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Price
                    </label>
                    <Input
                      id={`item-price-${item.key}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={item.price || ""}
                      onChange={(e) =>
                        patchItem(item.key, { price: Number(e.target.value) || 0 })
                      }
                      placeholder="0"
                      disabled={busy}
                      className="h-8 w-full text-xs"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onItemsChange((prev) => prev.filter((i) => i.key !== item.key))
                }
                disabled={busy}
                className="mt-1 shrink-0 text-muted-foreground transition hover:text-red-500 disabled:opacity-40"
                aria-label={`Remove ${item.name || "item"}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {targetItem && (
        <ImageGridModalV2
          isOpen
          onOpenChange={(open) => {
            if (!open) closeMediaLibrary();
          }}
          itemName={targetItem.name}
          category={targetItem.category}
          currentImage={targetItem.image_url}
          onSelectImage={(url) => handleImagePicked(targetItem.key, url)}
        />
      )}
    </div>
  );
}
