"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw, Store } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import AddRestaurantPanel from "@/components/televery/AddRestaurantPanel";

type Business = {
  id: string;
  username: string | null;
  storeName: string | null;
  location: string | null;
  phone: string | null;
  status: string | null;
  orders: number;
  revenue: number;
};

type OutletOrders = {
  partnerId: string;
  page: number;
  pageSize: number;
  total: number;
  orders: {
    id: string;
    displayId: string | number | null;
    createdAt: string;
    status: string | null;
    type: string | null;
    totalPrice: number | null;
    customerName: string | null;
    customerPhone: string | null;
  }[];
};

type Overview = {
  brand: { id: string; name: string } | null;
  totals: { businesses: number; orders: number; revenue: number };
  businesses: Business[];
  outletOrders: OutletOrders | null;
};

const inr = (n: number) =>
  `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-gray-900">
        {value}
      </p>
    </div>
  );
}

const statusColor = (s: string | null) => {
  switch ((s || "").toLowerCase()) {
    case "completed":
      return "bg-green-50 text-green-700 ring-green-200";
    case "cancelled":
      return "bg-red-50 text-red-700 ring-red-200";
    case "pending":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    default:
      return "bg-gray-50 text-gray-600 ring-gray-200";
  }
};

export default function TeleveryDashboardPage() {
  const signOut = useAuthStore((s) => s.signOut);

  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Business | null>(null);
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(
    async (opts?: { partnerId?: string; page?: number; quiet?: boolean }) => {
      if (opts?.quiet) setRefreshing(true);
      else setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (opts?.partnerId) qs.set("partnerId", opts.partnerId);
        if (opts?.page) qs.set("page", String(opts.page));
        const res = await fetch(
          `/api/televery/overview${qs.toString() ? `?${qs}` : ""}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load");
        setData(json);
      } catch (err: any) {
        toast.error(err?.message || "Could not load the dashboard");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const openBusiness = (b: Business) => {
    setSelected(b);
    setPage(0);
    load({ partnerId: b.id, page: 0 });
  };

  const backToList = () => {
    setSelected(null);
    setPage(0);
    load();
  };

  const goPage = (next: number) => {
    if (!selected) return;
    setPage(next);
    load({ partnerId: selected.id, page: next });
  };

  const orders = data?.outletOrders;
  const totalPages = orders ? Math.ceil(orders.total / orders.pageSize) : 0;

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
              Marketplace
            </p>
            <h1 className="truncate text-lg font-extrabold tracking-tight text-gray-900">
              {data?.brand?.name || "Televery"}
            </h1>
          </div>
          <button
            onClick={() => (selected ? load({ partnerId: selected.id, page, quiet: true }) : load({ quiet: true }))}
            className="grid h-9 w-9 place-items-center rounded-full text-gray-500 transition hover:bg-gray-100"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => signOut()}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : selected && orders ? (
          /* ── Drill-down: one connected business ── */
          <>
            <button
              onClick={backToList}
              className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="h-4 w-4" /> All businesses
            </button>

            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">
              {selected.storeName}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {orders.total} order{orders.total === 1 ? "" : "s"} · {inr(selected.revenue)}
            </p>

            <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
              {orders.orders.length === 0 ? (
                <p className="px-4 py-12 text-center text-sm text-gray-400">
                  No orders yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {orders.orders.map((o) => (
                    <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-gray-900">
                          #{o.displayId ?? o.id.slice(0, 8)}
                          {o.customerName ? (
                            <span className="ml-2 font-medium text-gray-500">
                              {o.customerName}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-400">
                          {new Date(o.createdAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                          {o.type ? ` · ${o.type.replace("_", " ")}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${statusColor(o.status)}`}
                      >
                        {o.status || "—"}
                      </span>
                      <span className="w-20 shrink-0 text-right text-sm font-bold text-gray-900">
                        {inr(o.totalPrice || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => goPage(page - 1)}
                  disabled={page <= 0}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-black/[0.06] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-gray-600">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => goPage(page + 1)}
                  disabled={page + 1 >= totalPages}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-black/[0.06] disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          /* ── Overview ── */
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Kpi label="Businesses" value={String(data?.totals.businesses ?? 0)} />
              <Kpi label="Total orders" value={String(data?.totals.orders ?? 0)} />
              <Kpi label="Revenue" value={inr(data?.totals.revenue ?? 0)} />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <h2 className="text-base font-extrabold tracking-tight text-gray-900">
                Connected businesses
              </h2>
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
                Add restaurant
              </button>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
              {(data?.businesses.length ?? 0) === 0 ? (
                <p className="px-4 py-12 text-center text-sm text-gray-400">
                  No businesses connected yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {data!.businesses.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => openBusiness(b)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600">
                        <Store className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-gray-900">
                          {b.storeName}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-gray-400">
                          {b.location || b.username}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-bold text-gray-900">
                          {b.orders}
                        </span>
                        <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                          orders
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {showAdd && (
        <AddRestaurantPanel
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            load({ quiet: true });
          }}
        />
      )}
    </div>
  );
}
