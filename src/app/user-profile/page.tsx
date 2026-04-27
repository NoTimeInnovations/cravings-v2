"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, User, Partner } from "@/store/authStore";
import useOrderStore from "@/store/orderStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  updateUserFullNameMutation,
  updateUserPhoneMutation,
  softDeleteUserMutation,
} from "@/api/auth";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  LogOut,
  Loader2,
  User as UserIcon,
  Phone,
  ShoppingBag,
  ChevronRight,
  Edit,
  Check,
  X,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { getStatusDisplay } from "@/lib/getStatusDisplay";

export default function UserProfilePage() {
  const { userData, signOut, loading: authLoading } = useAuthStore();
  const { userOrders, subscribeUserOrders } = useOrderStore();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [storePath, setStorePath] = useState<string | null>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hotelTheme");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.storePath) setStorePath(parsed.storePath);
      }
    } catch { }
  }, []);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const user = userData?.role === "user" ? (userData as User) : null;

  useEffect(() => {
    if (authLoading) return;
    if (!userData) {
      router.replace("/login");
      return;
    }
    if (user) {
      setNameValue(user.full_name || "");
      setPhoneValue(user.phone || "");
    }
  }, [authLoading, userData, user, router]);

  useEffect(() => {
    if (userData?.id) {
      const unsubscribe = subscribeUserOrders(() => {
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [userData?.id, subscribeUserOrders]);

  const [showAllStores, setShowAllStores] = useState(false);

  const ordersByStore = useMemo(() => {
    const grouped: Record<
      string,
      { storeName: string; currency: string; orders: typeof userOrders; latestOrder: string }
    > = {};
    for (const order of userOrders) {
      const partnerId = (order as any).partnerId || (order as any).partner_id;
      const storeName = (order.partner as any)?.store_name || "Unknown Store";
      const currency = (order.partner as Partner)?.currency || "₹";
      if (!grouped[partnerId]) {
        grouped[partnerId] = { storeName, currency, orders: [], latestOrder: order.createdAt };
      }
      grouped[partnerId].orders.push(order);
      if (order.createdAt > grouped[partnerId].latestOrder) {
        grouped[partnerId].latestOrder = order.createdAt;
      }
    }
    return grouped;
  }, [userOrders]);

  const sortedStoreEntries = useMemo(() => {
    const entries = Object.entries(ordersByStore).sort(
      ([, a], [, b]) => new Date(b.latestOrder).getTime() - new Date(a.latestOrder).getTime()
    );
    return showAllStores ? entries : entries.slice(0, 1);
  }, [ordersByStore, showAllStores]);

  const totalStoreCount = Object.keys(ordersByStore).length;

  const handleSaveName = async () => {
    if (!user || !nameValue.trim()) return;
    setSavingName(true);
    try {
      await fetchFromHasura(updateUserFullNameMutation, {
        id: user.id,
        full_name: nameValue.trim(),
      });
      useAuthStore.setState({
        userData: { ...user, full_name: nameValue.trim() } as any,
      });
      toast.success("Name updated");
      setEditingName(false);
    } catch {
      toast.error("Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePhone = async () => {
    if (!user || !phoneValue.trim()) return;
    setSavingPhone(true);
    try {
      await fetchFromHasura(updateUserPhoneMutation, {
        id: user.id,
        phone: phoneValue.trim(),
      });
      useAuthStore.setState({
        userData: { ...user, phone: phoneValue.trim() } as any,
      });
      toast.success("Phone number updated");
      setEditingPhone(false);
    } catch {
      toast.error("Failed to update phone number");
    } finally {
      setSavingPhone(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await fetchFromHasura(softDeleteUserMutation, { id: user.id });
      toast.success("Account deleted successfully");
      await signOut();
      router.replace("/");
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace(storePath || "/");
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3 bg-white border-b border-gray-200">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full transition-colors hover:bg-gray-100"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="font-semibold text-base text-gray-900 flex-1">
          My Profile
        </h1>
      </div>

      <div className="container mx-auto px-4 pb-24 pt-4 max-w-lg">
        {/* Profile Card */}
        <div className="rounded-xl p-5 mb-6 shadow-sm bg-white border border-gray-200">
          <div className="flex items-center gap-4 mb-5">
            <div className="h-14 w-14 rounded-full flex items-center justify-center bg-orange-50">
              <UserIcon className="h-7 w-7 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold truncate text-gray-900">
                {user.full_name || "User"}
              </p>
              <p className="text-sm text-gray-500">{user.phone}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </label>
              {editingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={savingName}>
                    {savingName ? (
                      <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                    ) : (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditingName(false); setNameValue(user.full_name || ""); }}>
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm font-medium text-gray-900">{user.full_name || "Not set"}</p>
                  <Button size="icon" variant="ghost" onClick={() => setEditingName(true)}>
                    <Edit className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Phone
              </label>
              {editingPhone ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={phoneValue}
                    onChange={(e) => setPhoneValue(e.target.value)}
                    className="flex-1"
                    autoFocus
                    type="tel"
                  />
                  <Button size="icon" variant="ghost" onClick={handleSavePhone} disabled={savingPhone}>
                    {savingPhone ? (
                      <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                    ) : (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditingPhone(false); setPhoneValue(user.phone || ""); }}>
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">{user.phone}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setEditingPhone(true)}>
                    <Edit className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          className="w-full mb-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors bg-gray-100 text-red-500 border border-gray-200"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>

        {/* Delete Account */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-center text-sm text-red-500 underline underline-offset-2 mb-6"
          >
            Delete Account
          </button>
        ) : (
          <div className="rounded-xl p-4 mb-6 border border-red-200 bg-red-50">
            <p className="text-sm text-red-700 font-medium mb-1">
              Are you sure you want to delete your account?
            </p>
            <p className="text-xs text-red-500 mb-3">
              Your account will be permenantly deleted. Confirm before deletion.
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" className="flex-1" onClick={handleDeleteAccount} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Yes, Delete
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Orders by Store */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <ShoppingBag className="h-5 w-5" />
            My Orders
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : totalStoreCount === 0 ? (
            <div className="text-center py-12 rounded-xl text-gray-500 bg-gray-100 border border-gray-200">
              No orders yet
            </div>
          ) : (
            <div className="space-y-4">
              {sortedStoreEntries.map(
                ([partnerId, { storeName, currency, orders }]) => (
                  <div key={partnerId} className="rounded-xl overflow-hidden shadow-sm bg-white border border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                      <h3 className="font-semibold text-sm text-gray-900">{storeName}</h3>
                      <span className="text-xs text-gray-500">
                        {orders.length} order{orders.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div>
                      {orders.slice(0, 5).map((order, idx) => {
                        const statusDisplay = getStatusDisplay(order);
                        const foodTotal = (order.items || []).reduce(
                          (sum: number, item: any) => sum + item.price * item.quantity, 0
                        );
                        return (
                          <Link
                            key={order.id}
                            href={`/order/${order.id}`}
                            className={`px-4 py-3 flex items-center justify-between transition-colors ${idx < Math.min(orders.length, 5) - 1 ? "border-b border-gray-100" : ""
                              }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  #{order.id.slice(0, 8)}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${statusDisplay.className}`}>
                                  {statusDisplay.text}
                                </span>
                              </div>
                              <p className="text-xs mt-0.5 text-gray-500">
                                {format(new Date(order.createdAt), "MMM d, h:mm a")} - {order.items?.length || 0} items
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {currency}{foodTotal.toFixed(2)}
                              </span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </Link>
                        );
                      })}
                      {orders.length > 5 && (
                        <Link
                          href="/my-orders"
                          className="px-4 py-3 text-center text-sm font-medium transition-colors block text-orange-500 border-t border-gray-100"
                        >
                          View all orders
                        </Link>
                      )}
                    </div>
                  </div>
                ),
              )}

              {!showAllStores && totalStoreCount > 1 && (
                <button
                  onClick={() => setShowAllStores(true)}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-colors text-orange-500 bg-orange-50 border border-orange-100"
                >
                  Show orders from {totalStoreCount - 1} other restaurant{totalStoreCount - 1 > 1 ? "s" : ""}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
