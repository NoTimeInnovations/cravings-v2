"use client";

import React, { useEffect, useRef, useState } from "react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { searchUsersForAdminQuery } from "@/api/auth";
import { deleteCustomerFully } from "@/app/actions/deleteCustomerFully";
import { Loader2, Search, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminUser {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

// Super-admin tool to permanently delete a customer account AND all of their
// linked data — orders, order items, POS rows, payments, reviews, table orders,
// offers claimed and loyalty — in one atomic transaction (see
// deleteCustomerFully). Handy for re-testing signup / WhatsApp account-creation
// flows: the row is gone, so the next find-or-create makes a fresh account.
export default function DeleteCustomer() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Drops out-of-order responses so the latest query wins.
  const reqRef = useRef(0);

  const load = async (q: string) => {
    const myReq = ++reqRef.current;
    setLoading(true);
    try {
      const { users: rows } = await fetchFromHasura(searchUsersForAdminQuery, {
        query: `%${q.trim()}%`,
        limit: 50,
      });
      if (myReq === reqRef.current) setUsers((rows as AdminUser[]) || []);
    } catch (e) {
      console.error("user search failed", e);
      if (myReq === reqRef.current) setUsers([]);
    } finally {
      if (myReq === reqRef.current) setLoading(false);
    }
  };

  // Initial load + debounced search (400ms).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(search), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const handleDelete = async (u: AdminUser) => {
    const label = u.full_name || u.phone || u.email || u.id;
    if (
      !window.confirm(
        `Permanently delete "${label}" and ALL their data?\n\n` +
          "This removes their orders, payments, reviews, loyalty and more. " +
          "This cannot be undone.",
      )
    ) {
      return;
    }
    setDeletingId(u.id);
    try {
      const res = await deleteCustomerFully(u.id);
      if (!res.ok) throw new Error(res.error || "Delete failed");
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e: any) {
      alert("Could not delete this customer.\n\n" + (e?.message || ""));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Search for a customer and permanently delete their account. Useful for
        re-testing signup / WhatsApp flows.
      </p>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone or email…"
          className="w-full rounded-lg border border-orange-200 bg-white py-2.5 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-orange-400" />
        )}
      </div>

      {/* Results */}
      <div className="rounded-lg border border-orange-100 bg-white overflow-hidden">
        {users.length === 0 && !loading ? (
          <div className="p-6 text-center text-sm text-gray-400">
            No customers found.
          </div>
        ) : (
          <ul className="divide-y divide-orange-50">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50/40"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                  <User className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {u.full_name || "(no name)"}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {[u.phone, u.email].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={deletingId === u.id}
                  onClick={() => handleDelete(u)}
                  className="shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {deletingId === u.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                    </>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Showing up to 50 results. Refine your search to narrow down.
      </p>
    </div>
  );
}
