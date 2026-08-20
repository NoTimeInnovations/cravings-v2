"use client";

import * as React from "react";
import {
  ArrowLeft,
  Bike,
  Info,
  Loader2,
  Lock,
  Pencil,
  Phone as PhoneIcon,
  Plus,
  SlidersHorizontal,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { formatPrice } from "@/lib/constants";
import { getFeatures } from "@/lib/getFeatures";
import { Partner, useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { usesOwnDeliveryBoys } from "@/lib/ownDriverDispatch";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createDeliveryBoyMutation,
  deleteDeliveryBoyMutation,
  getDeliveryBoyStatsOrdersQuery,
  getDeliveryBoysQuery,
  updateDeliveryBoyMutation,
  updateDeliveryBoyPasswordMutation,
} from "@/api/deliveryBoys";
import {
  EMPTY_STATS,
  deliveryChargeOf,
  orderKm,
  orderOccurredAt,
  ordersForRider,
  periodStart,
  rangeFor,
  statsByRider,
  totalStats,
  type GeoPoint,
  type RiderStats,
  type Scope,
  type StatsOrder,
} from "@/lib/deliveryBoyStats";
import { AdminV3Button, V3Card } from "./ui/primitives";
import { V3Input, V3Toggle } from "./menu/formKit";

/**
 * admin-v3 Delivery Boys.
 *
 * Same data layer as admin-v2's screen — `getDeliveryBoysQuery` for the roster
 * (re-polled every 5s so online/offline is live), `getDeliveryBoyStatsOrdersQuery`
 * for the orders behind the figures, and every number computed by
 * `src/lib/deliveryBoyStats.ts`. Nothing here re-derives a stat, so a rider's
 * orders/value/delivery-charge/distance can never disagree between the two
 * dashboards.
 *
 * What changed is the surface: a period + scope toolbar above a summary strip,
 * one wide table from `md` up with a card list below it, and the add/edit form
 * as a full sub-view rather than a modal + inline row editor.
 *
 * ONE READ, MANY PERIODS: the 30-day window is fetched once and Today / 7 days /
 * 30 days are sliced from it in memory, so flipping the period costs no request.
 */

interface DeliveryBoy {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  is_online: boolean;
  partner_id: string;
}

type PeriodKey = "day" | "week" | "month";

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
];

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "completed", label: "Delivered" },
  { value: "all", label: "Incl. in progress" },
];

const PERIOD_LABEL: Record<PeriodKey, string> = {
  day: "today",
  week: "last 7 days",
  month: "last 30 days",
};

/** Seven columns, matching the design: rider, phone, toggle, and four figures. */
const GRID =
  "grid grid-cols-[minmax(190px,1.6fr)_104px_84px_116px_132px_116px_78px] items-center";

const initialsOf = (name: string, phone: string) => {
  const n = (name || "").trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
  }
  const d = String(phone || "").replace(/\D/g, "");
  return d ? d.slice(-2) : "?";
};

/** The design greys a figure that is zero, so a busy row reads at a glance. */
const zeroTone = (isZero: boolean) =>
  isZero
    ? "text-zinc-400 dark:text-zinc-500"
    : "text-zinc-950 dark:text-zinc-50";

/* --------------------------------------------------------------- Segmented */

/** The design's inset pill group (period, scope). Wraps rather than scrolls —
 *  both groups sit on one toolbar row on a phone. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-[3px] rounded-lg border border-zinc-200 bg-zinc-100 p-[3px] dark:border-zinc-700 dark:bg-zinc-800"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={[
              "h-[30px] whitespace-nowrap rounded-md px-3 text-[12.5px] leading-none transition-colors",
              active
                ? "border border-zinc-200 bg-white font-semibold text-zinc-950 shadow-[0_1px_2px_rgba(9,9,11,.06)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                : "border border-transparent bg-transparent font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------- Stat */

function Stat({
  label,
  value,
  sub,
  dim,
}: {
  label: string;
  value: string;
  sub?: string;
  dim?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
        {label}
      </div>
      <div
        className={[
          "mt-1 text-[19px] font-semibold leading-none tracking-[-0.02em] tabular-nums",
          dim ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-950 dark:text-zinc-50",
        ].join(" ")}
      >
        {value}
        {sub ? (
          <span className="ml-[5px] text-[12.5px] font-normal text-zinc-400 dark:text-zinc-500">
            {sub}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Row actions */

/** The design's 30×30 outlined row buttons — neutral edit, red-on-hover delete. */
function RowIconButton({
  onClick,
  title,
  tone = "neutral",
  disabled,
  children,
}: {
  onClick: () => void;
  title: string;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border bg-white p-0 transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800",
        tone === "danger"
          ? "text-zinc-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-500"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- Sub-view */

type FormMode = { kind: "new" } | { kind: "edit"; boy: DeliveryBoy };

const suggestPassword = () => {
  // No look-alike characters (0/O, 1/l/I) — this gets read aloud or copied onto
  // paper before a rider types it into the app.
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
};

function NextStep({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-[11px]">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50">
          {title}
        </div>
        <div className="mt-1 text-xs font-normal leading-[1.5] text-zinc-400 dark:text-zinc-500">
          {body}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------- rider app settings */

type QrMethod = "none" | "upi" | "cashfree";

/**
 * Settings for the rider app itself — currently just what its "Show QR" button
 * displays when a rider collects payment at the door.
 *
 * Moved here off Payments & tax: it configures the RIDER's screen, not how
 * customers pay at checkout, and the partners who care about it are the ones
 * already on this page managing riders.
 *
 * Saves on its own rather than through the settings screen's Save button, which
 * does not exist here.
 */
function RiderAppSettingsView({ onBack }: { onBack: () => void }) {
  const { userData, setState } = useAuthStore();
  const partner = userData as Partner | undefined;

  const stored: QrMethod =
    partner?.delivery_qr_method === "upi" || partner?.delivery_qr_method === "cashfree"
      ? partner.delivery_qr_method
      : "none";
  const [method, setMethod] = React.useState<QrMethod>(stored);
  const [saving, setSaving] = React.useState(false);

  // Re-sync if the partner row lands after mount (userData arrives async).
  React.useEffect(() => setMethod(stored), [stored]);

  const upiId = partner?.upi_id || "";
  const cashfreeId = (partner as any)?.cashfree_merchant_id || "";
  const dirty = method !== stored;

  const handleSave = async () => {
    if (!partner?.id || saving) return;
    setSaving(true);
    try {
      await updatePartner(partner.id, { delivery_qr_method: method });
      await revalidateTag(partner.id);
      setState({ delivery_qr_method: method } as any);
      toast.success("Rider app settings saved");
      onBack();
    } catch (e) {
      console.error("[v3 riders] app settings save failed:", e);
      toast.error("Could not save — please try again");
    } finally {
      setSaving(false);
    }
  };

  const hint =
    method === "none"
      ? "The button is hidden — riders collect cash only."
      : method === "upi"
        ? `The rider shows a QR for ${upiId || "your UPI ID"}, so the money lands in your account directly.`
        : "A fresh Cashfree UPI QR is made for that order's exact amount, so the payment is matched automatically.";

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to delivery boys"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
        </button>
        <div className="min-w-0 flex-[1_1_200px]">
          <div className="truncate text-base font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            App settings
          </div>
          <div className="mt-0.5 truncate text-[12.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
            {saving ? "Saving…" : dirty ? "Unsaved changes" : "What your riders see in the app"}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-[13px]"
            onClick={onBack}
            disabled={saving}
          >
            Cancel
          </AdminV3Button>
          <AdminV3Button
            variant="primary"
            className="h-[34px]"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </AdminV3Button>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        <V3Card className="min-w-0">
          <div className="flex items-center border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
            <span className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
              Collecting payment at the door
            </span>
          </div>
          <div className="flex flex-col gap-3 px-4 py-3.5">
            <div>
              <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                What the rider&apos;s &quot;Show QR&quot; button displays
              </div>
              <div className="mt-2">
                <Segmented
                  ariaLabel="Rider QR method"
                  value={method}
                  options={[
                    { value: "none" as const, label: "No QR" },
                    { value: "upi" as const, label: "My UPI ID" },
                    { value: "cashfree" as const, label: "Per-order QR" },
                  ]}
                  onChange={setMethod}
                />
              </div>
            </div>
            <div className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
              {hint}
            </div>
            {method === "upi" && !upiId ? (
              <div className="rounded-lg bg-zinc-50 px-3 py-2.5 text-[12px] leading-[1.5] text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
                No UPI ID saved yet — add one under Settings → Payments &amp; tax
                → Methods, or the rider gets an empty QR.
              </div>
            ) : null}
            {method === "cashfree" && !cashfreeId ? (
              <div className="rounded-lg bg-zinc-50 px-3 py-2.5 text-[12px] leading-[1.5] text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
                Cashfree is not connected yet — turn on Online payment under
                Settings → Payments &amp; tax, or the per-order QR cannot be made.
              </div>
            ) : null}
          </div>
        </V3Card>
      </div>
    </div>
  );
}

function RiderFormView({
  mode,
  onCancel,
  onSaved,
  partnerId,
}: {
  mode: FormMode;
  onCancel: () => void;
  onSaved: () => void;
  partnerId: string;
}) {
  const editing = mode.kind === "edit" ? mode.boy : null;
  const [name, setName] = React.useState(editing?.name ?? "");
  const [phone, setPhone] = React.useState(editing?.phone ?? "");
  const [password, setPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const digits = phone.replace(/\D/g, "");
  const phoneOk = digits.length >= 7;
  // On edit the password field means "replace it" — blank keeps what they have.
  const passwordOk = editing ? password.length === 0 || password.length >= 6 : password.length >= 6;
  const ready = name.trim().length > 0 && phoneOk && passwordOk && !saving;

  const phoneHint = !phone
    ? "This number is their username in the rider app, so it must be one they carry."
    : phoneOk
      ? "They sign in with this number."
      : "That looks too short — enter the full number.";

  const passwordHint = editing
    ? password.length === 0
      ? "Leave blank to keep their current password."
      : password.length >= 6
        ? "This replaces their current password. Share it with them once."
        : "Too short — use at least 6 characters."
    : password.length === 0
      ? "You will need to share this with them once. They cannot reset it themselves."
      : password.length >= 6
        ? "Share this with them once — they cannot reset it themselves."
        : "Too short — use at least 6 characters.";

  const status = saving
    ? "Saving…"
    : ready
      ? editing
        ? "Ready to save"
        : "Ready to create"
      : editing
        ? "Change what you need, then save"
        : "Name, phone and a password are required";

  const handleSave = async () => {
    if (!ready) return;
    setSaving(true);
    try {
      // Two riders on one number would break the rider app's login, which
      // matches on phone alone — so this is checked before either write.
      const dupe = await fetchFromHasura(
        `
          query CheckDeliveryBoyPhone($phone: String!, $partner_id: uuid!) {
            delivery_boys(where: {phone: {_eq: $phone}, partner_id: {_eq: $partner_id}}) { id }
          }
        `,
        { phone, partner_id: partnerId },
      );
      const clash = (dupe?.delivery_boys ?? []).some(
        (d: { id: string }) => d.id !== editing?.id,
      );
      if (clash) throw new Error("A delivery boy with this phone number already exists.");

      if (editing) {
        await fetchFromHasura(updateDeliveryBoyMutation, {
          id: editing.id,
          name: name.trim(),
          phone,
          is_active: editing.is_active,
        });
        if (password) {
          await fetchFromHasura(updateDeliveryBoyPasswordMutation, {
            id: editing.id,
            password,
          });
        }
        toast.success("Delivery boy updated");
      } else {
        await fetchFromHasura(createDeliveryBoyMutation, {
          name: name.trim(),
          phone,
          password,
          partner_id: partnerId,
        });
        toast.success("Delivery boy created");
      }
      onSaved();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save delivery boy";
      console.error("Error saving delivery boy:", error);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const label = editing ? "Edit delivery boy" : "Add delivery boy";

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Back to delivery boys"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
        </button>
        <div className="min-w-0 flex-[1_1_200px]">
          <div className="truncate text-base font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            {label}
          </div>
          <div className="mt-0.5 truncate text-[12.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
            {status}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-[13px]"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </AdminV3Button>
          <AdminV3Button
            variant="primary"
            className="h-[34px]"
            onClick={handleSave}
            disabled={!ready}
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving…
              </>
            ) : editing ? (
              "Save changes"
            ) : (
              "Create rider"
            )}
          </AdminV3Button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        <V3Card className="min-w-0 flex-[1_1_360px]">
          <div className="flex items-center border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
            <span className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
              Rider details
            </span>
          </div>
          <div className="flex flex-col gap-3.5 px-4 py-3.5">
            <div>
              <label
                htmlFor="v3-rider-name"
                className="block text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300"
              >
                Name
              </label>
              <V3Input
                id="v3-rider-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ajmal K"
                className="mt-1.5 h-[38px] text-[13px]"
              />
            </div>
            <div>
              <label
                htmlFor="v3-rider-phone"
                className="block text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300"
              >
                Phone
              </label>
              <V3Input
                id="v3-rider-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="mt-1.5 h-[38px] text-[13px] tabular-nums"
              />
              <div className="mt-1.5 text-xs font-normal leading-[1.45] text-zinc-400 dark:text-zinc-500">
                {phoneHint}
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <label
                  htmlFor="v3-rider-password"
                  className="flex-1 text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setPassword(suggestPassword())}
                  className="text-xs font-medium leading-none text-zinc-600 underline underline-offset-2 dark:text-zinc-300"
                >
                  Suggest one
                </button>
              </div>
              <V3Input
                id="v3-rider-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editing ? "Leave blank to keep it" : "At least 6 characters"}
                className="mt-1.5 h-[38px] text-[13px]"
              />
              <div className="mt-1.5 text-xs font-normal leading-[1.45] text-zinc-400 dark:text-zinc-500">
                {passwordHint}
              </div>
            </div>
          </div>
        </V3Card>

        <V3Card className="min-w-0 flex-[1_1_280px]">
          <div className="flex items-center border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
            <span className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
              What happens next
            </span>
          </div>
          <div className="flex flex-col gap-[13px] px-4 py-3.5">
            <NextStep
              icon={<PhoneIcon size={14} strokeWidth={1.7} />}
              title="They sign in with this phone"
              body="The number is the username in the rider app, so it must be one they carry."
            />
            <NextStep
              icon={<Lock size={14} strokeWidth={1.7} />}
              title="Share the password once"
              body="You can change it later from their row. Riders cannot reset it themselves."
            />
            <NextStep
              icon={<User size={14} strokeWidth={1.7} />}
              title="They start able to take orders"
              body="Use the toggle on their row to stop assigning them without deleting the account."
            />
          </div>
        </V3Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ screen */

export function AdminV3DeliveryBoys() {
  const { userData, setState } = useAuthStore();
  const partner = userData as Partner | undefined;
  const currency = partner?.currency || "₹";
  const partnerId = userData?.id;

  const features =
    userData?.role === "partner" ? getFeatures(userData.feature_flags || "") : null;
  const isDeliveryEnabled = !!features?.delivery?.enabled;

  const [riders, setRiders] = React.useState<DeliveryBoy[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [statsOrders, setStatsOrders] = React.useState<StatsOrder[]>([]);
  const [partnerGeo, setPartnerGeo] = React.useState<GeoPoint>(null);
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<PeriodKey>("day");
  // Delivered-only by default: the safer reading when a figure might justify pay.
  const [scope, setScope] = React.useState<Scope>("completed");
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormMode | null>(null);
  const [appSettings, setAppSettings] = React.useState(false);

  /**
   * "Use delivery boys" — whether the manual assign control appears on an
   * order at all. Default ON when the setting is absent, so nothing changes
   * for a partner who already had riders before this switch existed.
   *
   * Stored on delivery_rules, which is read-modify-write: it also holds the
   * delivery pricing rules and the Porter low-balance threshold, and writing
   * the whole object would drop them.
   */
  const useRiders = usesOwnDeliveryBoys(partner);
  const [savingUse, setSavingUse] = React.useState(false);

  const toggleUseRiders = async () => {
    if (!partner?.id || savingUse) return;
    const next = !useRiders;
    setSavingUse(true);
    try {
      const raw = (partner as { delivery_rules?: unknown }).delivery_rules;
      let rules: Record<string, unknown> = {};
      if (raw && typeof raw === "object") rules = { ...(raw as object) };
      else if (typeof raw === "string") {
        try {
          rules = JSON.parse(raw);
        } catch {
          rules = {};
        }
      }
      rules.use_delivery_boys = next;
      await updatePartner(partner.id, { delivery_rules: rules } as any);
      await revalidateTag(partner.id);
      setState({ delivery_rules: rules } as any);
      toast.success(
        next
          ? "Delivery boys on — you can assign riders to orders"
          : "Delivery boys off — orders will not offer a rider to assign",
      );
    } catch (e) {
      console.error("[v3 riders] use_delivery_boys:", e);
      toast.error("Could not save — please try again");
    } finally {
      setSavingUse(false);
    }
  };
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [breakdownFor, setBreakdownFor] = React.useState<DeliveryBoy | null>(null);

  const fetchRiders = React.useCallback(
    async (silent = false) => {
      if (!partnerId) return;
      try {
        const response = await fetchFromHasura(getDeliveryBoysQuery, {
          partner_id: partnerId,
        });
        if (response?.delivery_boys) setRiders(response.delivery_boys);
      } catch (error) {
        if (!silent) {
          console.error("Error fetching delivery boys:", error);
          toast.error("Failed to load delivery boys");
        }
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [partnerId],
  );

  React.useEffect(() => {
    if (!partnerId || !isDeliveryEnabled) {
      setIsLoading(false);
      return;
    }
    fetchRiders();
    // Live online/offline: poll every 5s, the codebase's realtime pattern for
    // this table. Silent, so the roster never flickers an error toast.
    const interval = setInterval(() => fetchRiders(true), 5000);
    return () => clearInterval(interval);
  }, [partnerId, isDeliveryEnabled, fetchRiders]);

  // One read covering the LONGEST window on screen; Today and 7 days are sliced
  // from the same rows, so the period toggle costs nothing. Deliberately not on
  // the 5s poll — a month of orders every five seconds would be wasteful.
  React.useEffect(() => {
    if (!partnerId || !isDeliveryEnabled) {
      setStatsLoading(false);
      return;
    }
    let cancelled = false;
    setStatsLoading(true);
    (async () => {
      try {
        const res = await fetchFromHasura(getDeliveryBoyStatsOrdersQuery, {
          partner_id: partnerId,
          from: periodStart("month").toISOString(),
        });
        if (cancelled) return;
        setStatsOrders(res?.orders ?? []);
        setPartnerGeo(res?.partners_by_pk?.geo_location ?? null);
      } catch (error) {
        // Non-fatal: the roster still renders and the figure columns stay empty
        // rather than taking the whole screen down.
        console.error("Error fetching delivery stats:", error);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId, isDeliveryEnabled]);

  // Recomputed only when the period changes: `rangeFor` reads the clock, and
  // rebuilding it every render would invalidate every figure downstream.
  const range = React.useMemo(() => rangeFor(period), [period]);

  const riderStats = React.useMemo(
    () => statsByRider(statsOrders, partnerGeo, range, scope),
    [statsOrders, partnerGeo, range, scope],
  );
  const overall = React.useMemo(() => totalStats(riderStats), [riderStats]);

  const money = React.useCallback(
    (n: number) => `${currency}${formatPrice(n, partnerId)}`,
    [currency, partnerId],
  );

  const onlineCount = riders.filter((r) => r.is_online).length;
  const activeCount = riders.filter((r) => r.is_active).length;

  const handleToggleActive = async (boy: DeliveryBoy) => {
    setTogglingId(boy.id);
    // Optimistic: the switch has to answer the tap immediately, and the 5s poll
    // (or the catch below) puts it back if the write failed.
    setRiders((list) =>
      list.map((r) => (r.id === boy.id ? { ...r, is_active: !r.is_active } : r)),
    );
    try {
      await fetchFromHasura(updateDeliveryBoyMutation, {
        id: boy.id,
        name: boy.name,
        phone: boy.phone,
        is_active: !boy.is_active,
      });
      toast.success(
        !boy.is_active ? "Now taking orders" : "Stopped taking orders",
      );
    } catch (error) {
      console.error("Error toggling delivery boy status:", error);
      setRiders((list) =>
        list.map((r) => (r.id === boy.id ? { ...r, is_active: boy.is_active } : r)),
      );
      toast.error("Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (boy: DeliveryBoy) => {
    const ok = await confirmDialog({
      title: "Delete this delivery boy?",
      description:
        "Their account will be removed and they will lose access to the delivery app. This action cannot be undone.",
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setDeletingId(boy.id);
    try {
      await fetchFromHasura(deleteDeliveryBoyMutation, { id: boy.id });
      toast.success("Delivery boy deleted");
      fetchRiders();
    } catch (error) {
      console.error("Error deleting delivery boy:", error);
      toast.error("Failed to delete delivery boy");
    } finally {
      setDeletingId(null);
    }
  };

  /* ------------------------------------------------------------ gated off */

  if (!isDeliveryEnabled) {
    return (
      <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
        <V3Card className="flex flex-col items-center gap-2 px-5 py-16 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-500">
            <Truck size={19} strokeWidth={1.7} />
          </span>
          <div className="text-[13.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
            Delivery is not enabled
          </div>
          <div className="max-w-sm text-xs font-normal leading-[1.5] text-zinc-400 dark:text-zinc-500">
            Riders, assignment and delivery figures switch on with the delivery
            feature. Contact support to enable it for your store.
          </div>
        </V3Card>
      </div>
    );
  }

  /* -------------------------------------------------------------- sub-view */

  if (appSettings) {
    return <RiderAppSettingsView onBack={() => setAppSettings(false)} />;
  }

  if (form) {
    return (
      <RiderFormView
        mode={form}
        partnerId={partnerId ?? ""}
        onCancel={() => setForm(null)}
        onSaved={() => {
          setForm(null);
          fetchRiders();
        }}
      />
    );
  }

  /* ------------------------------------------------------------ row pieces */

  const statCell = (v: string, zero: boolean) => (
    <div
      className={[
        "px-4 py-3 text-right text-[13px] font-medium leading-none tabular-nums",
        zero ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-950 dark:text-zinc-50",
      ].join(" ")}
    >
      {v}
    </div>
  );

  /** The three figure cells. When a rider has orders, the count opens the
   *  order-by-order breakdown — the same rows the totals were built from, so a
   *  figure someone is paid on can always be checked. */
  const rowFigures = (boy: DeliveryBoy, st: RiderStats) =>
    statsLoading ? (
      <>
        {statCell("—", true)}
        {statCell("—", true)}
        {statCell("—", true)}
      </>
    ) : (
      <>
        <div className="px-4 py-3 text-right text-[13px] font-medium leading-none tabular-nums">
          {st.orders === 0 ? (
            <span className="text-zinc-400 dark:text-zinc-500">0</span>
          ) : (
            <button
              type="button"
              onClick={() => setBreakdownFor(boy)}
              title="See the orders behind these figures"
              className="text-zinc-950 underline decoration-dotted underline-offset-4 hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-300"
            >
              {st.orders}
            </button>
          )}
        </div>
        {statCell(money(st.value), st.value === 0)}
        {statCell(money(st.deliveryCharge), st.deliveryCharge === 0)}
      </>
    );

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 px-3 lg:px-0">
        <Segmented
          ariaLabel="Period"
          value={period}
          options={PERIOD_OPTIONS}
          onChange={setPeriod}
        />
        <Segmented
          ariaLabel="Which orders count"
          value={scope}
          options={SCOPE_OPTIONS}
          onChange={setScope}
        />
        <AdminV3Button
          variant="secondary"
          className="ml-auto"
          onClick={() => setAppSettings(true)}
        >
          <SlidersHorizontal size={15} strokeWidth={1.8} />
          App settings
        </AdminV3Button>
        <AdminV3Button variant="primary" onClick={() => setForm({ kind: "new" })}>
          <Plus size={15} strokeWidth={2} />
          Add delivery boy
        </AdminV3Button>
      </div>

      {/* Summary strip */}
      <V3Card className="flex flex-wrap items-center gap-x-[22px] gap-y-3.5 px-4 py-3.5">
        <Stat
          label="Riders"
          value={String(riders.length)}
          sub={riders.length > 0 ? `${onlineCount} online` : undefined}
        />
        <div className="hidden w-px self-stretch bg-zinc-100 sm:block dark:bg-zinc-800" />
        <Stat
          label={`Orders ${PERIOD_LABEL[period]}`}
          value={statsLoading ? "—" : String(overall.orders)}
          dim={statsLoading || overall.orders === 0}
        />
        <Stat
          label="Order value"
          value={statsLoading ? "—" : money(overall.value)}
          dim={statsLoading || overall.value === 0}
        />
        <Stat
          label="Delivery charge"
          value={statsLoading ? "—" : money(overall.deliveryCharge)}
          dim={statsLoading || overall.deliveryCharge === 0}
        />

        {/* Sits in the summary strip rather than in its own card: it is one
            switch, and a full-width card for it would push the figures down
            the page to say less. */}
        <div className="ml-auto flex items-center gap-3">
          <div className="min-w-0 text-right">
            <div className="text-[12.5px] font-medium leading-none text-zinc-950 dark:text-zinc-50">
              Use delivery boys
            </div>
            <div className="mt-1.5 text-[11.5px] leading-none text-zinc-400 dark:text-zinc-500">
              {useRiders ? "Orders can be assigned to a rider" : "No rider option on orders"}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={useRiders}
            aria-label="Use delivery boys"
            disabled={savingUse}
            onClick={() => void toggleUseRiders()}
            className={cn(
              "relative h-[24px] w-[42px] shrink-0 rounded-full transition-colors disabled:opacity-50",
              useRiders ? "bg-zinc-900 dark:bg-zinc-50" : "bg-zinc-200 dark:bg-zinc-700",
            )}
          >
            <span
              className={cn(
                "absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all dark:bg-zinc-900",
                useRiders ? "left-[21px]" : "left-[3px]",
              )}
            />
          </button>
        </div>
        <Stat
          label="Distance"
          value={statsLoading ? "—" : `${overall.km} km`}
          sub={
            !statsLoading && overall.ordersWithoutLocation > 0
              ? `${overall.ordersWithoutLocation} without location`
              : undefined
          }
          dim={statsLoading || overall.km === 0}
        />
      </V3Card>

      {/* Roster */}
      <V3Card>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
          <span className="flex-1 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            Riders
          </span>
          {riders.length > 0 && (
            <span className="whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[3px] text-[11px] font-medium leading-none text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {activeCount} of {riders.length} taking orders
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-zinc-400 dark:text-zinc-500" />
          </div>
        ) : riders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-11 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-500">
              <Bike size={19} strokeWidth={1.7} />
            </span>
            <div className="text-[13.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              No delivery boys yet
            </div>
            <div className="max-w-sm text-xs font-normal leading-[1.5] text-zinc-400 dark:text-zinc-500">
              Add one and they can sign in to the rider app with their phone
              number to start taking your deliveries.
            </div>
          </div>
        ) : (
          <>
            {/* Table — md and up. Scrolls inside itself, never the page. */}
            <div className="hidden overflow-x-auto md:block">
              <div className="min-w-[900px]">
                <div className={`${GRID} bg-zinc-50 dark:bg-zinc-800/60`}>
                  {[
                    { k: "Rider", right: false },
                    { k: "Phone", right: false },
                    { k: "Taking orders", right: false },
                    { k: "Orders", right: true },
                    { k: "Order value", right: true },
                    { k: "Delivery charge", right: true },
                    { k: "", right: true },
                  ].map((h, i) => (
                    <div
                      key={i}
                      className={[
                        "whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500",
                        h.right ? "text-right" : "",
                      ].join(" ")}
                    >
                      {h.k}
                    </div>
                  ))}
                </div>

                {riders.map((boy) => {
                  const st: RiderStats = riderStats[boy.id] ?? EMPTY_STATS;
                  return (
                    <div
                      key={boy.id}
                      className={`${GRID} border-t border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50`}
                    >
                      <div className="flex min-w-0 items-center gap-[11px] px-4 py-3">
                        <span
                          translate="no"
                          className="notranslate flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[11.5px] font-semibold leading-none text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {initialsOf(boy.name, boy.phone)}
                        </span>
                        <div className="min-w-0">
                          <div
                            translate="no"
                            className="notranslate truncate text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50"
                          >
                            {boy.name}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span
                              className={[
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                boy.is_online
                                  ? "bg-green-600"
                                  : "bg-zinc-300 dark:bg-zinc-600",
                              ].join(" ")}
                            />
                            <span className="text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
                              {boy.is_online ? "Online now" : "Offline"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        translate="no"
                        className="notranslate whitespace-nowrap px-4 py-3 text-[12.5px] font-normal leading-none text-zinc-700 tabular-nums dark:text-zinc-300"
                      >
                        {boy.phone}
                      </div>

                      <div className="px-4 py-3">
                        <V3Toggle
                          checked={boy.is_active}
                          disabled={togglingId === boy.id}
                          onChange={() => handleToggleActive(boy)}
                          label={
                            boy.is_active ? "Taking orders" : "Not taking orders"
                          }
                        />
                      </div>

                      {rowFigures(boy, st)}

                      <div className="flex items-center justify-end gap-1.5 px-4 py-3">
                        <RowIconButton
                          title="Edit rider"
                          onClick={() => setForm({ kind: "edit", boy })}
                        >
                          <Pencil size={15} strokeWidth={1.7} />
                        </RowIconButton>
                        <RowIconButton
                          title="Delete rider"
                          tone="danger"
                          disabled={deletingId === boy.id}
                          onClick={() => handleDelete(boy)}
                        >
                          {deletingId === boy.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} strokeWidth={1.7} />
                          )}
                        </RowIconButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card list — below md. */}
            <div className="flex flex-col gap-2.5 p-3 md:hidden">
              {riders.map((boy) => {
                const st: RiderStats = riderStats[boy.id] ?? EMPTY_STATS;
                const figure = (label: string, value: string, zero: boolean) => (
                  <span className="inline-flex items-baseline gap-[5px]">
                    <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">
                      {label}
                    </span>
                    <span
                      className={`text-[12.5px] font-medium tabular-nums ${zeroTone(zero)}`}
                    >
                      {value}
                    </span>
                  </span>
                );
                return (
                  <div
                    key={boy.id}
                    className="flex flex-col gap-2.5 rounded-[10px] border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="flex items-center gap-[11px]">
                      <span
                        translate="no"
                        className="notranslate flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-xs font-semibold leading-none text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {initialsOf(boy.name, boy.phone)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div
                          translate="no"
                          className="notranslate truncate text-[13.5px] font-medium leading-none text-zinc-950 dark:text-zinc-50"
                        >
                          {boy.name}
                        </div>
                        <div
                          translate="no"
                          className="notranslate mt-1 truncate text-xs font-normal leading-none text-zinc-400 tabular-nums dark:text-zinc-500"
                        >
                          {boy.phone} · {boy.is_online ? "Online now" : "Offline"}
                        </div>
                      </div>
                      <V3Toggle
                        checked={boy.is_active}
                        disabled={togglingId === boy.id}
                        onChange={() => handleToggleActive(boy)}
                        label={boy.is_active ? "Taking orders" : "Not taking orders"}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-[5px]">
                      {statsLoading ? (
                        <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">
                          Loading figures…
                        </span>
                      ) : (
                        <>
                          {figure("Orders", String(st.orders), st.orders === 0)}
                          {figure("Value", money(st.value), st.value === 0)}
                          {figure(
                            "Delivery",
                            money(st.deliveryCharge),
                            st.deliveryCharge === 0,
                          )}
                        </>
                      )}
                      <div className="ml-auto flex gap-1.5">
                        <RowIconButton
                          title="Edit rider"
                          onClick={() => setForm({ kind: "edit", boy })}
                        >
                          <Pencil size={15} strokeWidth={1.7} />
                        </RowIconButton>
                        <RowIconButton
                          title="Delete rider"
                          tone="danger"
                          disabled={deletingId === boy.id}
                          onClick={() => handleDelete(boy)}
                        >
                          {deletingId === boy.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} strokeWidth={1.7} />
                          )}
                        </RowIconButton>
                      </div>
                    </div>
                    {!statsLoading && st.orders > 0 && (
                      <button
                        type="button"
                        onClick={() => setBreakdownFor(boy)}
                        className="self-start text-xs font-medium leading-none text-zinc-600 underline underline-offset-2 dark:text-zinc-300"
                      >
                        See the {st.orders === 1 ? "order" : "orders"} behind this
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footnote. Stated in the open rather than in a tooltip: someone may pay
            riders on these numbers. */}
        <div className="bg-zinc-50 px-4 py-3 lg:rounded-b-xl dark:bg-zinc-800/60">
          <button
            type="button"
            onClick={() => setNoteOpen((v) => !v)}
            aria-expanded={noteOpen}
            className="flex w-full items-center gap-2 text-left"
          >
            <Info
              size={14}
              strokeWidth={1.8}
              className="shrink-0 text-zinc-400 dark:text-zinc-500"
            />
            <span className="flex-1 text-[12.5px] font-medium leading-none text-zinc-600 dark:text-zinc-300">
              How these figures work
            </span>
            <span className="text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
              {noteOpen ? "Hide" : "Show"}
            </span>
          </button>
          {noteOpen && (
            <div className="mt-[11px] flex flex-col gap-[9px] border-t border-zinc-200 pt-[11px] dark:border-zinc-700">
              {[
                {
                  term: "Distance",
                  body: " — straight line from the restaurant to each customer, one way. Real road distance is always higher, so treat it as a minimum, not a payout figure. Orders with no saved location add nothing.",
                },
                {
                  term: "Delivered vs incl. in progress",
                  body: " — Delivered counts only orders that reached the customer. Incl. in progress also counts orders still out, so it shows current workload but can fall if one is cancelled. Cancelled orders never count.",
                },
                {
                  term: "Delivery charge",
                  body: " — what customers actually paid for delivery. It is already part of order value, not extra, and excludes parcel and packing charges.",
                },
              ].map((n) => (
                <div key={n.term}>
                  <span className="text-[12.5px] font-medium text-zinc-700 dark:text-zinc-300">
                    {n.term}
                  </span>
                  <span className="text-xs font-normal leading-[1.55] text-zinc-400 dark:text-zinc-500">
                    {n.body}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </V3Card>

      {/* Order-by-order breakdown. Uses ordersForRider, which applies the SAME
          period/scope predicates as the totals — a breakdown that did not add up
          to the number it explains would be worse than none. */}
      <Dialog
        open={!!breakdownFor}
        onOpenChange={(open) => !open && setBreakdownFor(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          {breakdownFor &&
            (() => {
              const rows = ordersForRider(statsOrders, breakdownFor.id, range, scope);
              const st = riderStats[breakdownFor.id] ?? EMPTY_STATS;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle translate="no" className="notranslate">
                      {breakdownFor.name}
                    </DialogTitle>
                    <DialogDescription>
                      {rows.length} {rows.length === 1 ? "order" : "orders"} in the{" "}
                      {PERIOD_LABEL[period]}
                      {scope === "completed"
                        ? " (delivered only)"
                        : " (including in progress)"}
                      {" — "}
                      {money(st.value)} order value, {money(st.deliveryCharge)} delivery
                      charge, {st.km} km.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <div className="min-w-[620px]">
                      <div className="grid grid-cols-[1.4fr_1fr_0.9fr_0.9fr_1fr_0.9fr] bg-zinc-50 dark:bg-zinc-800/60">
                        {["Order", "When", "Status", "Value", "Delivery", "Distance"].map(
                          (h, i) => (
                            <div
                              key={h}
                              className={[
                                "whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500",
                                i >= 3 ? "text-right" : "",
                              ].join(" ")}
                            >
                              {h}
                            </div>
                          ),
                        )}
                      </div>
                      {rows.map((o: StatsOrder) => {
                        const km = orderKm(o, partnerGeo);
                        return (
                          <div
                            key={o.id}
                            className="grid grid-cols-[1.4fr_1fr_0.9fr_0.9fr_1fr_0.9fr] border-t border-zinc-100 dark:border-zinc-800"
                          >
                            <div className="min-w-0 px-3 py-2.5">
                              <div className="text-[13px] font-medium leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                                {Number(o.display_id) > 0 ? `#${o.display_id}` : "—"}
                              </div>
                              {o.delivery_address && (
                                <div
                                  translate="no"
                                  className="notranslate mt-1 truncate text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500"
                                >
                                  {o.delivery_address}
                                </div>
                              )}
                            </div>
                            <div className="whitespace-nowrap px-3 py-2.5 text-[12.5px] font-normal leading-none text-zinc-700 dark:text-zinc-300">
                              {orderOccurredAt(o).toLocaleString(undefined, {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {!o.delivered_at && (
                                <span
                                  className="ml-1 text-amber-600 dark:text-amber-500"
                                  title="No delivery time recorded — dated by when the order was placed."
                                >
                                  *
                                </span>
                              )}
                            </div>
                            <div className="px-3 py-2.5 text-[12.5px] font-normal capitalize leading-none text-zinc-500 dark:text-zinc-400">
                              {o.status}
                            </div>
                            <div className="px-3 py-2.5 text-right text-[12.5px] font-medium leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                              {money(Number(o.total_price) || 0)}
                            </div>
                            <div className="px-3 py-2.5 text-right text-[12.5px] font-medium leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                              {money(deliveryChargeOf(o))}
                            </div>
                            <div className="px-3 py-2.5 text-right text-[12.5px] font-normal leading-none tabular-nums">
                              {km === null ? (
                                <span
                                  className="text-amber-600 dark:text-amber-500"
                                  title="No customer location saved on this order, so it adds nothing to the distance total."
                                >
                                  not recorded
                                </span>
                              ) : (
                                <span className="text-zinc-700 dark:text-zinc-300">
                                  {km} km
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div className="grid grid-cols-[1.4fr_1fr_0.9fr_0.9fr_1fr_0.9fr] border-t border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60">
                        <div className="col-span-3 px-3 py-2.5 text-[12.5px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
                          Total
                        </div>
                        <div className="px-3 py-2.5 text-right text-[12.5px] font-semibold leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                          {money(st.value)}
                        </div>
                        <div className="px-3 py-2.5 text-right text-[12.5px] font-semibold leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                          {money(st.deliveryCharge)}
                        </div>
                        <div className="px-3 py-2.5 text-right text-[12.5px] font-semibold leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                          {st.km} km
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-normal leading-[1.5] text-zinc-400 dark:text-zinc-500">
                    Distance is straight-line from the restaurant to each customer, one
                    way, so the total is a minimum rather than the road distance actually
                    ridden. Rows marked{" "}
                    <span className="text-amber-600 dark:text-amber-500">*</span> have no
                    recorded delivery time and are dated by when the order was placed.
                  </p>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
