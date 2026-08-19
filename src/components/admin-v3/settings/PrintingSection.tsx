"use client";

import * as React from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { deleteFileFromS3, uploadFileToS3 } from "@/app/actions/aws-s3";
import {
  BILL_AUTO_PRINT_STATUSES,
  getBillAutoPrintStatus,
  getBillLayout,
  getBillLogoUrl,
  isBillAutoPrintEnabled,
  isBillDetailQrEnabled,
  isBillLogoEnabled,
  isFullArabic,
  type BillLayout,
} from "@/lib/printLayout";
import { cn } from "@/lib/utils";

import { AdminV3Button } from "../ui/primitives";
import {
  FieldRow,
  Note,
  SelectField,
  SettingsCard,
  TextField,
  ToggleRow,
  useSectionDraft,
} from "./controls";

/* ------------------------------------------------------------------ draft */

interface PrintingDraft {
  includeCategory: boolean;
  showDetailQr: boolean;
  showLogo: boolean;
  logoUrl: string;
  layout: BillLayout;
  fullArabic: boolean;
  autoPrint: boolean;
  autoPrintStatus: string;
  /** partners.fssai_licence_no — a column, not part of the delivery_rules blob. */
  fssaiNumber: string;
}

function read(partner: any): PrintingDraft {
  const rules = partner?.delivery_rules;
  return {
    includeCategory: !!rules?.bill_include_category_name,
    showDetailQr: isBillDetailQrEnabled(rules),
    showLogo: isBillLogoEnabled(rules),
    logoUrl: getBillLogoUrl(rules) || "",
    layout: getBillLayout(rules),
    fullArabic: isFullArabic(rules),
    autoPrint: isBillAutoPrintEnabled(rules),
    autoPrintStatus: getBillAutoPrintStatus(rules),
    fssaiNumber: partner?.fssai_licence_no || "",
  };
}

function build(d: PrintingDraft, partner: any): Record<string, unknown> {
  const existing = (partner?.delivery_rules || {}) as any;
  return {
    fssai_licence_no: d.fssaiNumber,
    delivery_rules: {
      ...existing,
      bill_include_category_name: d.includeCategory,
      bill_layout: d.layout,
      bill_full_arabic: d.fullArabic,
      bill_show_detail_qr: d.showDetailQr,
      bill_show_logo: d.showLogo,
      bill_logo_url: d.logoUrl || "",
      bill_auto_print_enabled: d.autoPrint,
      bill_auto_print_status: d.autoPrintStatus,
    },
  };
}

/* ------------------------------------------------------------------- tabs */

export type PrintingTab = "content" | "layout" | "auto";

export const PRINTING_TABS: { value: PrintingTab; label: string }[] = [
  { value: "content", label: "Bill content" },
  { value: "layout", label: "Layout" },
  { value: "auto", label: "Auto-print" },
];

const LAYOUT_OPTIONS: { value: BillLayout; title: string; desc: string }[] = [
  { value: "default", title: "Default", desc: "Standard Menuthere receipt" },
  { value: "invoice", title: "Tax Invoice", desc: "Bilingual ZATCA simplified tax invoice" },
  { value: "uae", title: "UAE Invoice", desc: "UAE VAT slip — VAT/Net labels always bilingual" },
];

/* ----------------------------------------------------------------- screen */

export function PrintingSection({ tab }: { tab: PrintingTab }) {
  /**
   * There is no "show FSSAI" column: the bill prints the number whenever it is
   * non-empty (see src/app/bill/[id]/page.tsx). So the toggle IS the number —
   * turning it off clears it, which is the only thing that actually stops it
   * printing. The cleared value is kept in a ref so flipping back on within the
   * session restores it instead of making the partner retype it.
   */
  const { partner, draft, patch } = useSectionDraft(read, build, "Printing settings saved");

  /**
   * There is no "show FSSAI" column: the bill prints the number whenever it is
   * non-empty (src/app/bill/[id]/page.tsx). So the toggle IS the number —
   * turning it off clears it, which is the only thing that actually stops it
   * printing. The cleared value is kept in a ref so flipping back on restores
   * it instead of making the partner retype it.
   */
  const [showFssai, setShowFssai] = React.useState(!!draft.fssaiNumber);
  const clearedFssai = React.useRef("");
  // The stored row arrives async, so seed the toggle once it does.
  React.useEffect(() => {
    if (draft.fssaiNumber) setShowFssai(true);
  }, [draft.fssaiNumber]);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const onPickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !partner) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setUploading(true);
    try {
      // Best-effort cleanup of the logo this one replaces.
      if (draft.logoUrl.includes("cravingsbucket")) {
        await deleteFileFromS3(draft.logoUrl).catch(() => {});
      }
      const ext = file.type.split("/")[1] || "png";
      const url = await uploadFileToS3(file, `bill_logos/${partner.id}_${Date.now()}.${ext}`);
      if (!url) throw new Error("Upload failed");
      patch({ logoUrl: url, showLogo: true });
      toast.success("Logo uploaded — press Save to apply");
    } catch (err) {
      console.error("[admin-v3 settings] bill logo upload failed:", err);
      toast.error("Failed to upload the logo");
    } finally {
      setUploading(false);
    }
  };

  if (tab === "content") {
    return (
      <SettingsCard>
        <ToggleRow
          title="Show the category before each item"
          desc={'e.g. "Biryani — Chicken Biryani" on the bill and KOT.'}
          checked={draft.includeCategory}
          onChange={(v) => patch({ includeCategory: v })}
          divider
        />
        <ToggleRow
          title="Print a QR to the online bill"
          desc="Customers scan it to open the order details."
          checked={draft.showDetailQr}
          onChange={(v) => patch({ showDetailQr: v })}
          divider
        />
        <ToggleRow
          title="Print your logo on the bill"
          desc="Bills with a logo print as an image, so text looks slightly softer."
          checked={draft.showLogo}
          onChange={(v) => patch({ showLogo: v })}
          divider
        />
        {/* Moved off Payments → Tax: it is printed on the bill, not charged. */}
        <ToggleRow
          title="Print your FSSAI number"
          desc="Adds the licence line to the bottom of every bill."
          checked={showFssai}
          onChange={(v) => {
            setShowFssai(v);
            if (v) {
              if (clearedFssai.current) patch({ fssaiNumber: clearedFssai.current });
            } else {
              clearedFssai.current = draft.fssaiNumber;
              patch({ fssaiNumber: "" });
            }
          }}
          divider={showFssai}
        />
        {showFssai ? (
          <FieldRow>
            <TextField
              label="FSSAI number"
              hint="printed on bills"
              value={draft.fssaiNumber}
              onChange={(v) => patch({ fssaiNumber: v })}
              placeholder="Licence number"
              translateNo
              basis="100%"
            />
          </FieldRow>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
            {draft.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.logoUrl} alt="Bill logo" className="h-full w-full object-contain" />
            ) : (
              <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                None
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              Bill logo
            </div>
            <div className="mt-1 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
              Black on white prints best on thermal paper.
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickLogo}
          />
          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3 text-[13px]"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {draft.logoUrl ? "Replace" : "Upload"}
          </AdminV3Button>
          {draft.logoUrl ? (
            <button
              type="button"
              aria-label="Remove the bill logo"
              onClick={async () => {
                if (draft.logoUrl.includes("cravingsbucket")) {
                  await deleteFileFromS3(draft.logoUrl).catch(() => {});
                }
                patch({ logoUrl: "", showLogo: false });
              }}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </SettingsCard>
    );
  }

  if (tab === "layout") {
    return (
      <SettingsCard>
        <div>
          <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
            Layout
          </div>
          <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
            {LAYOUT_OPTIONS.map((o) => {
              const on = o.value === draft.layout;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => patch({ layout: o.value })}
                  className={cn(
                    "rounded-lg border p-2.5 text-left transition-colors",
                    on
                      ? "border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-800"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700",
                  )}
                >
                  <div className="text-[12.5px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
                    {o.title}
                  </div>
                  <div className="mt-1.5 text-[12px] leading-[1.4] text-zinc-400 dark:text-zinc-500">
                    {o.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <ToggleRow
          title="Print labels in Arabic"
          desc="Item names keep their own text."
          checked={draft.fullArabic}
          onChange={(v) => patch({ fullArabic: v })}
        />
        <Note>
          Paper size and text scale stay in the desktop print app — they calibrate
          each printer.
        </Note>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard>
      <ToggleRow
        title="Print the bill automatically"
        desc="Prints from the device where the status is changed, so keep this dashboard open on the machine with the printer."
        checked={draft.autoPrint}
        onChange={(v) => patch({ autoPrint: v })}
        divider
      />
      <FieldRow>
        <SelectField
          label="Print when the order becomes"
          value={draft.autoPrintStatus}
          onChange={(v) => patch({ autoPrintStatus: v })}
          options={BILL_AUTO_PRINT_STATUSES}
          basis="100%"
          disabled={!draft.autoPrint}
        />
      </FieldRow>
    </SettingsCard>
  );
}
