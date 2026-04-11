"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const NOTIFICATION_SERVER_URL = "https://notification-server-khaki.vercel.app";

type PartnerRow = {
  id: string;
  name: string | null;
  store_name: string | null;
  status: string | null;
  onesignal_provisioned_at: string | null;
};

export default function OneSignalAppsPage() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [provisioningId, setProvisioningId] = useState<string | null>(null);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const res = await fetchFromHasura(
        `query GetPartnersOneSignal {
          partners(order_by: {store_name: asc}) {
            id
            name
            store_name
            status
            onesignal_provisioned_at
          }
        }`
      );
      setPartners(res?.partners ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch partners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return partners;
    const q = search.toLowerCase();
    return partners.filter(
      (p) =>
        (p.store_name || "").toLowerCase().includes(q) ||
        (p.name || "").toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [partners, search]);

  const provision = async (partnerId: string, force = false) => {
    setProvisioningId(partnerId);
    const toastId = toast.loading(
      force ? "Re-provisioning OneSignal app..." : "Creating OneSignal app..."
    );
    try {
      const res = await fetch(
        `${NOTIFICATION_SERVER_URL}/api/partners/${partnerId}/onesignal/provision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Provisioning failed");
      }
      toast.success(`OneSignal app created (id: ${data.appId?.slice(0, 8)}...)`, {
        id: toastId,
      });
      await loadPartners();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Provisioning failed";
      toast.error(msg, { id: toastId });
    } finally {
      setProvisioningId(null);
    }
  };

  return (
    <main className="px-3 py-5 pt-24 sm:px-[7.5%] bg-[#FFF7EC] min-h-screen">
      <div className="mb-6">
        <Link
          href="/superadmin"
          className="inline-flex items-center gap-2 px-4 py-2 rounded border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition font-medium"
        >
          <ChevronLeft size={20} />
          Back to Dashboard
        </Link>
      </div>
      <h1 className="text-2xl lg:text-4xl font-bold mb-2">OneSignal Apps (iOS)</h1>
      <p className="text-sm text-gray-600 mb-5">
        Provision a dedicated OneSignal app per partner for <strong>iOS push notifications</strong>.
        Android devices continue to use the shared Menuthere OneSignal app and do not require provisioning.
      </p>
      <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Input
          placeholder="Search by store name, name, or partner id"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md bg-white"
        />
        <div className="text-sm text-gray-600">
          {loading
            ? "Loading..."
            : `${filtered.length} partner${filtered.length === 1 ? "" : "s"}`}
        </div>
      </div>

      <div className="rounded border-2 border-[#ffba79]/20 bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>OneSignal</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const provisioned = !!p.onesignal_provisioned_at;
              const busy = provisioningId === p.id;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.store_name || "—"}
                  </TableCell>
                  <TableCell>{p.name || "—"}</TableCell>
                  <TableCell>{p.status || "—"}</TableCell>
                  <TableCell>
                    {provisioned ? (
                      <span className="inline-flex items-center gap-1 text-green-700 text-sm">
                        ✓ Provisioned
                      </span>
                    ) : (
                      <span className="text-gray-500 text-sm">Not provisioned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {provisioned ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Re-provision OneSignal app for "${p.store_name || p.name}"? The existing app will be replaced with a new one.`
                            )
                          ) {
                            provision(p.id, true);
                          }
                        }}
                      >
                        {busy ? "Working..." : "Re-provision"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => provision(p.id, false)}
                      >
                        {busy ? "Creating..." : "Create OneSignal App"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No partners found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </div>
    </main>
  );
}
