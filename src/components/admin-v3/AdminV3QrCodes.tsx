"use client";

import * as React from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Eye,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Printer,
  QrCode as QrIcon,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { subscribeToHasura } from "@/lib/hasuraSubscription";
import { useAuthStore } from "@/store/authStore";
import { getPlanLimits, isFreePlan } from "@/lib/getPlanLimits";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminV3Button, StatusPill, V3Card } from "./ui/primitives";

/**
 * QR codes / dine-in tables.
 *
 * Same data as admin-v2's AdminV2QrCodes: the `qr_codes` table, read through two
 * live subscriptions (a paged list and a partner-wide summary) and written with
 * the same three mutations. Nothing new was added to the data layer — the
 * summary strip's numbers are a Hasura aggregate over the rows the list already
 * reads, and the "Add tables" sub-view writes `table_name` / `price_adjustment`
 * on insert instead of leaving them null and making the partner edit each row.
 *
 * One honest deviation from the design: the design's dine-in pricing control
 * reads "Add a %", but `qr_codes.price_adjustment` is an absolute per-item
 * amount in the partner's currency (see src/app/qrScan/[[...id]]/page.tsx, which
 * does `basePrice + priceAdjustment`). Labelling it a percentage would make the
 * screen lie about what the storefront charges, so the control says "Add an
 * amount" and shows the currency symbol.
 */

const DOMAIN = "menuthere.com";
const PAGE_SIZE = 10;
const MAX_PER_CREATE = 50;
const QUICK_COUNTS = [4, 10, 20];

type QrCode = {
  id: string;
  qr_number: string;
  table_number: number | null;
  table_name: string | null;
  partner_id: string;
  partner: { store_name: string } | null;
  created_at: string;
  no_of_scans: number;
  price_adjustment: number | null;
  view_only?: boolean | null;
};

type SummaryTop = {
  id: string;
  table_number: number | null;
  table_name: string | null;
  no_of_scans: number;
};

const GET_MAX_TABLE_NUMBER = `
  query GetMaxTableNumber($partner_id: uuid!) {
    qr_codes(limit: 1, order_by: {table_number: desc_nulls_last}, where: {partner_id: {_eq: $partner_id}}) {
      table_number
    }
  }
`;

const INSERT_QR_CODES_MUTATION = `
  mutation InsertQrCodes($objects: [qr_codes_insert_input!]!) {
    insert_qr_codes(objects: $objects) {
      affected_rows
    }
  }
`;

const DELETE_QRS_MUTATION = `
  mutation DeleteQrs($qrIds: [uuid!]) {
    delete_qr_codes(where: {id: {_in: $qrIds}}) {
      affected_rows
    }
  }
`;

const UPDATE_QR_DETAILS_MUTATION = `
  mutation UpdateQrDetails($qrId: uuid!, $tableNumber: Int, $tableName: String, $price_adjustment: Int, $viewOnly: Boolean) {
    update_qr_codes_by_pk(pk_columns: {id: $qrId}, _set: {table_number: $tableNumber, table_name: $tableName, price_adjustment: $price_adjustment, view_only: $viewOnly}) {
      id
    }
  }
`;

const LIST_SUBSCRIPTION = `
  subscription GetPartnerQrsData($limit: Int!, $offset: Int!, $where: qr_codes_bool_exp!) {
    qr_codes(order_by: {table_number: asc_nulls_last, created_at: desc}, limit: $limit, offset: $offset, where: $where) {
      id
      qr_number
      table_number
      table_name
      partner_id
      no_of_scans
      price_adjustment
      view_only
      partner { store_name }
      created_at
    }
    qr_codes_aggregate(where: $where) {
      aggregate { count }
    }
  }
`;

const SUMMARY_SUBSCRIPTION = `
  subscription GetPartnerQrSummary($where: qr_codes_bool_exp!) {
    qr_codes_aggregate(where: $where) {
      aggregate {
        count
        sum { no_of_scans }
      }
    }
    top: qr_codes(where: $where, order_by: {no_of_scans: desc_nulls_last}, limit: 1) {
      id
      table_number
      table_name
      no_of_scans
    }
  }
`;

function scanUrl(qr: { id: string; partner?: { store_name: string } | null }) {
  const slug = (qr.partner?.store_name || "store").replace(/\s+/g, "-");
  return `https://${DOMAIN}/qrScan/${slug}/${qr.id}`;
}

function tableLabel(qr: Pick<QrCode, "table_name" | "table_number">) {
  return qr.table_name || (qr.table_number ? `Table ${qr.table_number}` : "Untitled");
}

/* ------------------------------------------------------------------ pieces */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
      {children}
    </div>
  );
}

const inputClass =
  "h-[38px] w-full rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] font-normal text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500";

function TickBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded p-0 transition-colors " +
        (checked
          ? "border-[1.5px] border-zinc-900 bg-zinc-900 dark:border-zinc-50 dark:bg-zinc-50"
          : "border-[1.5px] border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800")
      }
    >
      {checked && (
        <Check
          size={12}
          strokeWidth={3}
          className="text-white dark:text-zinc-900"
        />
      )}
    </button>
  );
}

function RowIconButton({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={
        "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border p-0 transition-colors " +
        (danger
          ? "border-zinc-200 bg-white text-zinc-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700")
      }
    >
      {children}
    </button>
  );
}

function SummaryStat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5 text-[19px] font-semibold leading-tight tracking-[-0.02em] text-zinc-950 tabular-nums dark:text-zinc-50">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ screen */

export function AdminV3QrCodes() {
  const { userData } = useAuthStore();
  const partnerId =
    (userData as any)?.role === "captain"
      ? ((userData as any)?.partner_id as string | undefined)
      : (userData as any)?.id;
  const storeName = (userData as any)?.store_name as string | undefined;
  const currency = ((userData as any)?.currency as string) || "₹";

  const planId = (userData as any)?.subscription_details?.plan?.id;
  const planLimits = getPlanLimits(planId);
  const onFreePlan = isFreePlan(planId);

  const [view, setView] = React.useState<"list" | "new">("list");

  const [qrs, setQrs] = React.useState<QrCode[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [filteredCount, setFilteredCount] = React.useState(0);

  const [totalTables, setTotalTables] = React.useState(0);
  const [totalScans, setTotalScans] = React.useState(0);
  const [busiest, setBusiest] = React.useState<SummaryTop | null>(null);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const [editing, setEditing] = React.useState<QrCode | null>(null);
  const [editForm, setEditForm] = React.useState({
    table_number: "",
    table_name: "",
    price_adjustment: "",
    view_only: false,
  });
  const [saving, setSaving] = React.useState(false);

  const [viewing, setViewing] = React.useState<QrCode | null>(null);
  const [viewingImage, setViewingImage] = React.useState("");

  const [deleteTarget, setDeleteTarget] = React.useState<string | null | "bulk">(
    null,
  );
  const [deleting, setDeleting] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  /* ------------------------------------------------------------- debounce */

  React.useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  /* ------------------------------------------------------- where clauses */

  const listWhere = React.useMemo(() => {
    const where: Record<string, any> = { partner_id: { _eq: partnerId } };
    const term = debouncedSearch.trim();
    if (term) {
      const like = `%${term}%`;
      const asNumber = parseInt(term, 10);
      if (!Number.isNaN(asNumber)) {
        where._or = [
          { table_name: { _ilike: like } },
          { table_number: { _eq: asNumber } },
        ];
      } else {
        where.table_name = { _ilike: like };
      }
    }
    return where;
  }, [partnerId, debouncedSearch]);

  /* ------------------------------------------------------- subscriptions */

  React.useEffect(() => {
    if (!partnerId) return;
    setLoading(true);
    setSelected(new Set());

    const unsub = subscribeToHasura({
      query: LIST_SUBSCRIPTION,
      variables: {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        where: listWhere,
      },
      onNext: (data) => {
        const rows = data?.data?.qr_codes;
        if (rows) setQrs(rows as QrCode[]);
        const count = data?.data?.qr_codes_aggregate?.aggregate?.count;
        if (typeof count === "number") setFilteredCount(count);
        setLoading(false);
      },
      onError: (err) => {
        console.error("QR list subscription error:", err);
        setLoading(false);
      },
    });

    return () => {
      if (typeof unsub === "function") unsub();
      else if (unsub && typeof (unsub as any).dispose === "function")
        (unsub as any).dispose();
    };
  }, [partnerId, page, listWhere]);

  React.useEffect(() => {
    if (!partnerId) return;
    const where = { partner_id: { _eq: partnerId } };

    const unsub = subscribeToHasura({
      query: SUMMARY_SUBSCRIPTION,
      variables: { where },
      onNext: (data) => {
        const agg = data?.data?.qr_codes_aggregate?.aggregate;
        if (agg) {
          setTotalTables(agg.count ?? 0);
          setTotalScans(agg.sum?.no_of_scans ?? 0);
        }
        const top = data?.data?.top?.[0] as SummaryTop | undefined;
        setBusiest(top && (top.no_of_scans ?? 0) > 0 ? top : null);
      },
      onError: (err) => console.error("QR summary subscription error:", err),
    });

    return () => {
      if (typeof unsub === "function") unsub();
      else if (unsub && typeof (unsub as any).dispose === "function")
        (unsub as any).dispose();
    };
  }, [partnerId]);

  /* ------------------------------------------------------------- actions */

  const atLimit =
    planLimits.max_qr_codes !== Infinity && totalTables >= planLimits.max_qr_codes;

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openEdit = (qr: QrCode) => {
    setEditing(qr);
    setEditForm({
      table_number: qr.table_number?.toString() ?? "",
      table_name: qr.table_name ?? "",
      price_adjustment: qr.price_adjustment?.toString() ?? "",
      view_only: qr.view_only ?? false,
    });
  };

  const submitEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await fetchFromHasura(UPDATE_QR_DETAILS_MUTATION, {
        qrId: editing.id,
        tableNumber: editForm.table_number
          ? parseInt(editForm.table_number, 10)
          : null,
        tableName: editForm.table_name || null,
        price_adjustment: editForm.price_adjustment
          ? parseInt(editForm.price_adjustment, 10)
          : null,
        viewOnly: editForm.view_only,
      });
      toast.success("Table updated");
      setEditing(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update table");
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    const ids =
      deleteTarget === "bulk" ? Array.from(selected) : deleteTarget ? [deleteTarget] : [];
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      await fetchFromHasura(DELETE_QRS_MUTATION, { qrIds: ids });
      toast.success(ids.length > 1 ? `${ids.length} tables deleted` : "Table deleted");
      setSelected(new Set());
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const openView = async (qr: QrCode) => {
    try {
      const url = await QRCode.toDataURL(scanUrl(qr), { width: 512, margin: 1 });
      setViewingImage(url);
      setViewing(qr);
    } catch {
      toast.error("Could not generate the QR image");
    }
  };

  const copyLink = (qr: QrCode) => {
    navigator.clipboard.writeText(scanUrl(qr));
    toast.success("Link copied");
  };

  const downloadOne = async (qr: QrCode) => {
    try {
      const url = await QRCode.toDataURL(scanUrl(qr), { width: 1024, margin: 1 });
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR-${tableLabel(qr).replace(/\s+/g, "-")}.png`;
      a.click();
    } catch {
      toast.error("Could not generate the QR image");
    }
  };

  /** Same Excel sheet admin-v2 produces: one row per table with its QR image. */
  const exportSheet = async () => {
    const rows = selected.size > 0 ? qrs.filter((q) => selected.has(q.id)) : qrs;
    if (rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    setExporting(true);
    try {
      const { Workbook } = await import("exceljs");
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet("Table QR Codes");
      worksheet.columns = [
        { header: "Table No", key: "table_no", width: 15 },
        { header: "QR Code", key: "qr_code", width: 30 },
        { header: "Scans", key: "scans", width: 10 },
      ];

      for (let i = 0; i < rows.length; i++) {
        const qr = rows[i];
        const base64 = await QRCode.toDataURL(scanUrl(qr));
        worksheet.addRow([
          qr.table_number || qr.table_name || "N/A",
          "",
          qr.no_of_scans || 0,
        ]);
        const imageId = workbook.addImage({ base64, extension: "png" });
        worksheet.addImage(imageId, {
          tl: { col: 1, row: i + 1 },
          ext: { width: 100, height: 100 },
        });
        worksheet.getRow(i + 2).height = 80;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "TableQRs.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("QR sheet downloaded");
    } catch (err) {
      console.error("Error generating QR sheet:", err);
      toast.error("Failed to build the QR sheet");
    } finally {
      setExporting(false);
    }
  };

  /* --------------------------------------------------------- add sub-view */

  if (view === "new") {
    return (
      <AddTablesView
        partnerId={partnerId}
        currency={currency}
        existingCount={totalTables}
        maxAllowed={planLimits.max_qr_codes}
        onCancel={() => setView("list")}
        onCreated={() => {
          setView("list");
          setPage(1);
        }}
      />
    );
  }

  /* ------------------------------------------------------------ list view */

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      {/* summary strip */}
      <V3Card className="flex flex-wrap items-center gap-x-[22px] gap-y-3.5 px-4 py-3.5">
        <SummaryStat label="Tables">{totalTables}</SummaryStat>

        <div className="hidden w-px self-stretch bg-zinc-100 dark:bg-zinc-800 sm:block" />

        <SummaryStat label="Scans all time">{totalScans}</SummaryStat>

        <SummaryStat label="Busiest table">
          {busiest ? (
            <>
              <span translate="no" className="notranslate">
                {tableLabel(busiest)}
              </span>
              <span className="text-[12.5px] font-normal text-zinc-400 dark:text-zinc-500">
                {busiest.no_of_scans} scan{busiest.no_of_scans === 1 ? "" : "s"}
              </span>
            </>
          ) : (
            <span className="text-[13.5px] font-normal text-zinc-400 dark:text-zinc-500">
              No scans yet
            </span>
          )}
        </SummaryStat>

        <AdminV3Button
          variant="primary"
          className="ml-auto"
          onClick={() => {
            if (atLimit) {
              toast.error(
                `Your plan allows ${planLimits.max_qr_codes} QR code${planLimits.max_qr_codes === 1 ? "" : "s"}. Upgrade to add more tables.`,
              );
              return;
            }
            setView("new");
          }}
        >
          <Plus size={15} strokeWidth={2} />
          Add tables
        </AdminV3Button>
      </V3Card>

      {onFreePlan && planLimits.max_qr_codes !== Infinity && (
        <V3Card className="flex flex-wrap items-center gap-2 px-4 py-3">
          <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
            QR codes used
          </span>
          <StatusPill tone={atLimit ? "amber" : "neutral"}>
            {totalTables} / {planLimits.max_qr_codes}
          </StatusPill>
          <span className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
            Upgrade your plan to add more tables.
          </span>
        </V3Card>
      )}

      {/* table list */}
      <V3Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
          <span className="shrink-0 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            Tables
          </span>
          <div className="ml-auto flex h-[34px] min-w-0 max-w-[300px] flex-[1_1_200px] items-center gap-[9px] rounded-md border border-zinc-200 bg-white px-[11px] dark:border-zinc-700 dark:bg-zinc-800">
            <Search
              size={15}
              strokeWidth={1.8}
              className="shrink-0 text-zinc-400 dark:text-zinc-500"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search table number or name…"
              aria-label="Search tables"
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-normal text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-[9px] border-b border-zinc-100 bg-zinc-50 px-4 py-[11px] dark:border-zinc-800 dark:bg-zinc-800/50">
            <span className="text-[12.5px] font-medium leading-none text-zinc-950 dark:text-zinc-50">
              {selected.size} selected
            </span>
            <AdminV3Button variant="small" onClick={exportSheet} disabled={exporting}>
              {exporting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Printer size={14} strokeWidth={1.7} />
              )}
              QR sheet
            </AdminV3Button>
            <AdminV3Button
              variant="small"
              onClick={() => setDeleteTarget("bulk")}
              className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950"
            >
              <Trash2 size={14} strokeWidth={1.7} />
              Delete
            </AdminV3Button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto text-[12.5px] font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Clear selection
            </button>
          </div>
        )}

        {loading ? (
          <div className="px-4 py-14 text-center text-[13.5px] text-zinc-500 dark:text-zinc-400">
            Loading tables…
          </div>
        ) : qrs.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="text-[13.5px] font-medium text-zinc-500 dark:text-zinc-400">
              {debouncedSearch.trim()
                ? "No table matches that search."
                : "No tables yet."}
            </p>
            <p className="mt-1 text-[12.5px] text-zinc-400 dark:text-zinc-500">
              Each QR opens your menu with that table pre-set, so dine-in orders
              arrive tagged.
            </p>
          </div>
        ) : (
          qrs.map((qr) => (
            <div
              key={qr.id}
              className="flex flex-wrap items-center gap-x-3.5 gap-y-3 border-b border-zinc-100 px-4 py-3.5 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
            >
              <TickBox
                checked={selected.has(qr.id)}
                onChange={() => toggleRow(qr.id)}
                label={`Select ${tableLabel(qr)}`}
              />

              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                <QrIcon size={18} strokeWidth={1.7} />
              </span>

              <div className="min-w-0 flex-[1_1_180px]">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span
                    translate="no"
                    className="notranslate text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50"
                  >
                    {tableLabel(qr)}
                  </span>
                  {qr.table_number != null && (
                    <StatusPill tone="outline" className="font-medium">
                      Table {qr.table_number}
                    </StatusPill>
                  )}
                  {qr.view_only && (
                    <StatusPill tone="amber" className="font-medium">
                      View only
                    </StatusPill>
                  )}
                </div>
                <div className="mt-[7px] flex flex-wrap items-center gap-x-3.5 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 text-[12px] leading-none text-zinc-400 dark:text-zinc-500">
                    <QrIcon size={12} strokeWidth={1.8} />
                    {qr.no_of_scans || 0} scan{(qr.no_of_scans || 0) === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="text-[12px] leading-none text-zinc-400 dark:text-zinc-500">
                      Pricing
                    </span>
                    <span className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                      {qr.price_adjustment
                        ? `${qr.price_adjustment > 0 ? "+" : "−"}${currency}${Math.abs(qr.price_adjustment)} per item`
                        : "Menu price"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <RowIconButton title="Open the menu this QR points to" onClick={() => openView(qr)}>
                  <Eye size={15} strokeWidth={1.7} />
                </RowIconButton>
                <RowIconButton title="Copy link" onClick={() => copyLink(qr)}>
                  <Copy size={15} strokeWidth={1.7} />
                </RowIconButton>
                <RowIconButton title="Download QR" onClick={() => downloadOne(qr)}>
                  <Download size={15} strokeWidth={1.7} />
                </RowIconButton>
                <RowIconButton title="Edit table" onClick={() => openEdit(qr)}>
                  <Pencil size={15} strokeWidth={1.7} />
                </RowIconButton>
                <RowIconButton title="Delete table" danger onClick={() => setDeleteTarget(qr.id)}>
                  <Trash2 size={15} strokeWidth={1.7} />
                </RowIconButton>
              </div>
            </div>
          ))
        )}

        <div className="flex flex-wrap items-center gap-2.5 bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
          <span className="text-[12px] text-zinc-400 dark:text-zinc-500">
            {filteredCount} table{filteredCount === 1 ? "" : "s"}
            {debouncedSearch.trim() ? " · filtered" : " · showing all"}
          </span>

          {totalPages > 1 ? (
            <div className="ml-auto flex items-center gap-2">
              <AdminV3Button
                variant="small"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </AdminV3Button>
              <span className="text-[12px] tabular-nums text-zinc-500 dark:text-zinc-400">
                {page} / {totalPages}
              </span>
              <AdminV3Button
                variant="small"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </AdminV3Button>
            </div>
          ) : (
            <span className="ml-auto text-[12px] leading-normal text-zinc-400 dark:text-zinc-500">
              Each QR opens your menu with that table pre-set, so dine-in orders
              arrive tagged.
            </span>
          )}
        </div>
      </V3Card>

      {/* ------------------------------------------------------- edit modal */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
              Edit table
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
              Changes apply to the QR that is already printed — no need to reprint.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-1">
            <div className="flex flex-wrap gap-3">
              <div className="min-w-0 flex-[1_1_120px]">
                <FieldLabel>Table number</FieldLabel>
                <input
                  type="number"
                  className={inputClass + " mt-1.5 tabular-nums"}
                  value={editForm.table_number}
                  onChange={(e) =>
                    setEditForm({ ...editForm, table_number: e.target.value })
                  }
                />
              </div>
              <div className="min-w-0 flex-[1_1_150px]">
                <FieldLabel>Table name</FieldLabel>
                <input
                  type="text"
                  className={inputClass + " mt-1.5"}
                  value={editForm.table_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, table_name: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <FieldLabel>Dine-in price adjustment (per item)</FieldLabel>
              <input
                type="number"
                placeholder={`e.g. 20 or -10 (${currency})`}
                className={inputClass + " mt-1.5 tabular-nums"}
                value={editForm.price_adjustment}
                onChange={(e) =>
                  setEditForm({ ...editForm, price_adjustment: e.target.value })
                }
              />
              <p className="mt-1.5 text-[12px] leading-normal text-zinc-400 dark:text-zinc-500">
                Added to every item price when this QR is scanned. Positive raises,
                negative lowers. Guests never see the adjustment itself.
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
              <span className="pt-0.5">
                <TickBox
                  checked={editForm.view_only}
                  onChange={(next) => setEditForm({ ...editForm, view_only: next })}
                  label="View only"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50">
                  View only
                </span>
                <span className="mt-1 block text-[12px] leading-normal text-zinc-500 dark:text-zinc-400">
                  Scanning opens the menu in browse mode — guests cannot add to cart
                  or order.
                </span>
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <AdminV3Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </AdminV3Button>
            <AdminV3Button variant="primary" onClick={submitEdit} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : "Save changes"}
            </AdminV3Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------- view modal */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle
              translate="no"
              className="notranslate text-[15px] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50"
            >
              {viewing ? tableLabel(viewing) : ""}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
              Guests scanning this open{" "}
              <span translate="no" className="notranslate">
                {storeName || "your menu"}
              </span>{" "}
              with the table already set.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-3 py-1">
            {viewingImage && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={viewingImage}
                alt="QR code"
                className="h-56 w-56 rounded-lg border border-zinc-200 bg-white dark:border-zinc-700"
              />
            )}
            <code className="max-w-full truncate rounded bg-zinc-100 px-2 py-1 text-[11.5px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {viewing ? scanUrl(viewing) : ""}
            </code>
          </div>

          <DialogFooter className="gap-2">
            <AdminV3Button
              variant="secondary"
              onClick={() => viewing && copyLink(viewing)}
            >
              <Copy size={14} strokeWidth={1.8} />
              Copy link
            </AdminV3Button>
            <AdminV3Button
              variant="primary"
              onClick={() => viewing && downloadOne(viewing)}
            >
              <Download size={14} strokeWidth={2} />
              Download PNG
            </AdminV3Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------- delete modal */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
              {deleteTarget === "bulk"
                ? `Delete ${selected.size} table${selected.size === 1 ? "" : "s"}?`
                : "Delete this table?"}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-normal text-zinc-500 dark:text-zinc-400">
              Printed QRs for {deleteTarget === "bulk" ? "these tables" : "this table"}{" "}
              stop working immediately. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <AdminV3Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </AdminV3Button>
            <AdminV3Button variant="danger" onClick={submitDelete} disabled={deleting}>
              {deleting ? <Loader2 size={14} className="animate-spin" /> : "Delete"}
            </AdminV3Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------- add tables view */

function AddTablesView({
  partnerId,
  currency,
  existingCount,
  maxAllowed,
  onCancel,
  onCreated,
}: {
  partnerId: string | undefined;
  currency: string;
  existingCount: number;
  maxAllowed: number;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [count, setCount] = React.useState(4);
  const [prefix, setPrefix] = React.useState("Table");
  const [startAt, setStartAt] = React.useState("");
  const [adjustPrice, setAdjustPrice] = React.useState(false);
  const [adjustValue, setAdjustValue] = React.useState("0");
  const [creating, setCreating] = React.useState(false);
  const [startLoaded, setStartLoaded] = React.useState(false);

  // Default "start at" to one past the highest existing table number, the same
  // sequence admin-v2 uses when it creates QRs.
  React.useEffect(() => {
    let cancelled = false;
    if (!partnerId) return;
    (async () => {
      try {
        const res = await fetchFromHasura(GET_MAX_TABLE_NUMBER, {
          partner_id: partnerId,
        });
        const max = res?.qr_codes?.[0]?.table_number || 0;
        if (!cancelled) setStartAt(String(max + 1));
      } catch {
        if (!cancelled) setStartAt("1");
      } finally {
        if (!cancelled) setStartLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  const remaining =
    maxAllowed === Infinity ? Infinity : Math.max(0, maxAllowed - existingCount);
  const capped = remaining === Infinity ? count : Math.min(count, remaining);
  const start = parseInt(startAt, 10);
  const startValid = !Number.isNaN(start) && start > 0;
  const ready = startLoaded && startValid && capped > 0 && !creating;

  const names = React.useMemo(() => {
    if (!startValid) return [] as { name: string; note: string }[];
    return Array.from({ length: capped }, (_, i) => ({
      name: `${prefix.trim() || "Table"}${start + i}`,
      note: `Table ${start + i}`,
    }));
  }, [capped, prefix, start, startValid]);

  const adjustment = adjustPrice ? parseInt(adjustValue, 10) || 0 : 0;

  const status = !startLoaded
    ? "Reading your current tables…"
    : capped === 0
      ? "Your plan's QR limit is reached."
      : `${capped} new table${capped === 1 ? "" : "s"} · numbering continues from ${start}`;

  const create = async () => {
    if (!partnerId || !ready) return;
    setCreating(true);
    try {
      const objects = Array.from({ length: capped }, (_, i) => ({
        qr_number: start + i,
        table_number: start + i,
        table_name: `${prefix.trim() || "Table"}${start + i}`,
        price_adjustment: adjustment !== 0 ? adjustment : null,
        partner_id: partnerId,
        created_at: new Date().toISOString(),
      }));
      await fetchFromHasura(INSERT_QR_CODES_MUTATION, { objects });
      toast.success(`${capped} table${capped === 1 ? "" : "s"} created`);
      onCreated();
    } catch (err) {
      console.error("Error creating QRs:", err);
      toast.error("Failed to create tables");
    } finally {
      setCreating(false);
    }
  };

  const stepper =
    "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white p-0 text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

  return (
    <div className="flex flex-col pb-10">
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-3.5 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 lg:px-[clamp(14px,3vw,28px)]">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Back to tables"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
        </button>
        <div className="min-w-0 flex-[1_1_200px]">
          <h1 className="text-[16px] font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            Add tables
          </h1>
          <p className="mt-0.5 text-[12.5px] leading-tight text-zinc-500 dark:text-zinc-400">
            {status}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <AdminV3Button variant="secondary" className="h-[34px]" onClick={onCancel}>
            Cancel
          </AdminV3Button>
          <AdminV3Button
            variant="primary"
            className="h-[34px]"
            onClick={create}
            disabled={!ready}
          >
            {creating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              `Create ${capped > 0 ? capped : ""} table${capped === 1 ? "" : "s"}`.replace(
                /\s+/g,
                " ",
              )
            )}
          </AdminV3Button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-3.5 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        {/* how many */}
        <V3Card className="min-w-0 flex-[1_1_360px]">
          <div className="border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
            <span className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
              How many
            </span>
          </div>

          <div className="flex flex-col gap-3.5 px-4 py-3.5">
            <div>
              <FieldLabel>Number of tables</FieldLabel>
              <div className="mt-[7px] flex flex-wrap items-center gap-[9px]">
                <button
                  type="button"
                  aria-label="One fewer table"
                  className={stepper}
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  disabled={count <= 1}
                >
                  <Minus size={15} strokeWidth={2} />
                </button>
                <span className="min-w-[34px] text-center text-[16px] font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                  {count}
                </span>
                <button
                  type="button"
                  aria-label="One more table"
                  className={stepper}
                  onClick={() => setCount((c) => Math.min(MAX_PER_CREATE, c + 1))}
                  disabled={count >= MAX_PER_CREATE}
                >
                  <Plus size={15} strokeWidth={2} />
                </button>
                <div className="ml-1.5 flex flex-wrap gap-[7px]">
                  {QUICK_COUNTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setCount(q)}
                      className="h-[34px] shrink-0 rounded-md border border-zinc-200 bg-white px-[11px] text-[12.5px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      {q} tables
                    </button>
                  ))}
                </div>
              </div>
              {remaining !== Infinity && count > remaining && (
                <p className="mt-2 text-[12px] leading-normal text-amber-700 dark:text-amber-400">
                  Your plan allows {maxAllowed} QR code
                  {maxAllowed === 1 ? "" : "s"} — only {remaining} more can be
                  created.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <div className="min-w-0 flex-[1_1_150px]">
                <FieldLabel>Name prefix</FieldLabel>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="Table"
                  className={inputClass + " mt-1.5"}
                />
              </div>
              <div className="min-w-0 flex-[1_1_120px]">
                <FieldLabel>Start at number</FieldLabel>
                <input
                  type="number"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className={inputClass + " mt-1.5 tabular-nums"}
                />
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <FieldLabel>Dine-in pricing</FieldLabel>
              <div className="mt-[7px] inline-flex flex-wrap gap-[3px] rounded-lg border border-zinc-200 bg-zinc-100 p-[3px] dark:border-zinc-700 dark:bg-zinc-800">
                {[
                  { key: false, label: "Menu price" },
                  { key: true, label: "Add an amount" },
                ].map((opt) => (
                  <button
                    key={String(opt.key)}
                    type="button"
                    onClick={() => setAdjustPrice(opt.key)}
                    className={
                      "h-[30px] rounded-md px-3 text-[12.5px] transition-colors " +
                      (adjustPrice === opt.key
                        ? "border border-zinc-200 bg-white font-semibold text-zinc-950 shadow-[0_1px_2px_rgba(9,9,11,.06)] dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                        : "border border-transparent bg-transparent font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100")
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {adjustPrice && (
                <div className="mt-2.5 flex flex-wrap items-center gap-[9px]">
                  <div className="flex h-[38px] flex-[0_1_150px] items-center gap-2 rounded-md border border-zinc-200 bg-white px-[11px] dark:border-zinc-700 dark:bg-zinc-800">
                    <span className="shrink-0 text-[13px] font-medium text-zinc-400 dark:text-zinc-500">
                      {currency}
                    </span>
                    <input
                      type="number"
                      value={adjustValue}
                      onChange={(e) => setAdjustValue(e.target.value)}
                      aria-label="Per-item price adjustment"
                      className="min-w-0 flex-1 border-0 bg-transparent text-[15px] font-semibold tabular-nums text-zinc-950 outline-none dark:text-zinc-50"
                    />
                    <span className="shrink-0 text-[13px] font-medium text-zinc-400 dark:text-zinc-500">
                      per item
                    </span>
                  </div>
                  <span className="min-w-0 flex-[1_1_140px] text-[12px] leading-normal text-zinc-400 dark:text-zinc-500">
                    Dine-in guests see every item priced this much higher. Use a
                    negative number to discount.
                  </span>
                </div>
              )}
            </div>
          </div>
        </V3Card>

        {/* preview */}
        <V3Card className="min-w-0 flex-[1_1_280px] overflow-hidden">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
            <span className="flex-[1_1_auto] text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
              You will create
            </span>
            <StatusPill tone="outline" className="font-medium">
              {capped} table{capped === 1 ? "" : "s"}
            </StatusPill>
          </div>

          {names.length === 0 ? (
            <div className="px-4 py-10 text-center text-[12.5px] text-zinc-400 dark:text-zinc-500">
              {startValid
                ? "Nothing to create."
                : "Enter a valid starting table number."}
            </div>
          ) : (
            names.slice(0, 4).map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-[11px] border-b border-zinc-100 px-4 py-[11px] dark:border-zinc-800"
              >
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <QrIcon size={15} strokeWidth={1.7} />
                </span>
                <span
                  translate="no"
                  className="notranslate min-w-0 flex-[1_1_auto] truncate text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50"
                >
                  {p.name}
                </span>
                <span className="shrink-0 text-[12px] leading-none text-zinc-400 dark:text-zinc-500">
                  {p.note}
                </span>
              </div>
            ))
          )}

          {names.length > 4 && (
            <div className="border-b border-zinc-100 px-4 py-[11px] text-[12px] text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
              + {names.length - 4} more
            </div>
          )}

          <div className="bg-zinc-50 px-4 py-3 text-[12px] leading-normal text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-500">
            Download the QR sheet from the table list once they exist. Existing
            tables are untouched.
          </div>
        </V3Card>
      </div>
    </div>
  );
}
