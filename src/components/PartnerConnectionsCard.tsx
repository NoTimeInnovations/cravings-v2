"use client";

import { useEffect, useState } from "react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  MessageCircle,
  UtensilsCrossed,
  UploadCloud,
  CreditCard,
  Loader2,
  RefreshCw,
} from "lucide-react";

/**
 * Read-only "integrations at a glance" card for a single partner. Shows whether
 * the partner is:
 *   • connected to WhatsApp (has a live whatsapp_business_integrations row),
 *   • connected to Petpooja (petpooja_restaurant_id set),
 *   • pushed its menu from Petpooja (petpooja_full_data present),
 *   • set up for Cashfree payments (cashfree_merchant_id set).
 *
 * Self-contained: give it a partnerId and it fetches its own status, so it drops
 * into both the superadmin Edit Partners screen and the admin-v2 Store Settings
 * screen without either parent having to load the extra fields.
 */

interface ConnStatus {
  whatsapp: boolean;
  whatsappCount: number;
  petpooja: boolean;
  petpoojaRestaurantId: string | null;
  petpoojaMenuPushed: boolean;
  cashfree: boolean;
  cashfreeMerchantId: string | null;
}

// Aggregates keep this cheap: petpooja_full_data is a big jsonb blob, so we test
// its presence with an _is_null:false COUNT instead of pulling the blob itself.
const CONN_QUERY = `
  query PartnerConnections($id: uuid!) {
    partners_by_pk(id: $id) {
      petpooja_restaurant_id
      cashfree_merchant_id
    }
    pushed: partners_aggregate(
      where: { id: { _eq: $id }, petpooja_full_data: { _is_null: false } }
    ) {
      aggregate { count }
    }
    wa: whatsapp_business_integrations_aggregate(
      where: { partner_id: { _eq: $id }, access_token: { _is_null: false } }
    ) {
      aggregate { count }
    }
  }
`;

function isSet(v: unknown): boolean {
  return typeof v === "string" ? v.trim().length > 0 : v != null;
}

async function fetchStatus(partnerId: string): Promise<ConnStatus> {
  const res = (await fetchFromHasura(CONN_QUERY, { id: partnerId })) as any;
  const p = res?.partners_by_pk ?? {};
  const waCount = res?.wa?.aggregate?.count ?? 0;
  const pushedCount = res?.pushed?.aggregate?.count ?? 0;
  return {
    whatsapp: waCount > 0,
    whatsappCount: waCount,
    petpooja: isSet(p.petpooja_restaurant_id),
    petpoojaRestaurantId: p.petpooja_restaurant_id ?? null,
    petpoojaMenuPushed: pushedCount > 0,
    cashfree: isSet(p.cashfree_merchant_id),
    cashfreeMerchantId: p.cashfree_merchant_id ?? null,
  };
}

function StatusRow({
  icon,
  label,
  detail,
  ok,
  okText = "Connected",
  offText = "Not connected",
}: {
  icon: React.ReactNode;
  label: string;
  detail?: string | null;
  ok: boolean;
  okText?: string;
  offText?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          ok ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {detail ? (
          <p className="truncate text-xs text-gray-500">{detail}</p>
        ) : null}
      </div>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
          ok ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500",
        )}
      >
        {ok ? <Check size={13} /> : <X size={13} />}
        {ok ? okText : offText}
      </span>
    </div>
  );
}

export default function PartnerConnectionsCard({
  partnerId,
  title = "Integrations",
  className,
}: {
  partnerId: string | null | undefined;
  title?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<ConnStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = async () => {
    if (!partnerId) return;
    setLoading(true);
    setError(false);
    try {
      setStatus(await fetchStatus(partnerId));
    } catch (e) {
      console.error("PartnerConnectionsCard fetch failed:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  if (!partnerId) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 bg-white p-4 md:p-5",
        className,
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && !status ? (
        <div className="flex items-center gap-2 py-6 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" /> Checking connections…
        </div>
      ) : error ? (
        <div className="flex items-center justify-between py-6 text-sm text-red-500">
          Couldn&apos;t load connection status.
          <button
            type="button"
            onClick={load}
            className="ml-3 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : status ? (
        <div className="divide-y divide-gray-100">
          <StatusRow
            icon={<MessageCircle size={18} />}
            label="WhatsApp"
            ok={status.whatsapp}
            detail={
              status.whatsapp
                ? status.whatsappCount > 1
                  ? `${status.whatsappCount} numbers connected`
                  : "Business API connected"
                : null
            }
          />
          <StatusRow
            icon={<UtensilsCrossed size={18} />}
            label="Petpooja"
            ok={status.petpooja}
            okText="Connected"
            detail={
              status.petpooja
                ? `Restaurant ID: ${status.petpoojaRestaurantId}`
                : null
            }
          />
          <StatusRow
            icon={<UploadCloud size={18} />}
            label="Petpooja menu pushed"
            ok={status.petpoojaMenuPushed}
            okText="Received"
            offText="Not received"
            detail={
              status.petpoojaMenuPushed
                ? "Full menu data received from Petpooja"
                : null
            }
          />
          <StatusRow
            icon={<CreditCard size={18} />}
            label="Cashfree payments"
            ok={status.cashfree}
            okText="Set up"
            offText="Not set up"
            detail={
              status.cashfree
                ? `Merchant ID: ${status.cashfreeMerchantId}`
                : null
            }
          />
        </div>
      ) : null}
    </div>
  );
}
