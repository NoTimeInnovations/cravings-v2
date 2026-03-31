"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, User, Partner } from "@/store/authStore";
import useOrderStore from "@/store/orderStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  updateUserFullNameMutation,
  updateUserPhoneMutation,
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
  UtensilsCrossed,
  ArrowLeft,
  Home,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { getStatusDisplay } from "@/lib/getStatusDisplay";

type StoredTheme = {
  accent?: string;
  bg?: string;
  text?: string;
  storeName?: string;
  storePath?: string;
};

export default function UserProfilePage() {
  const { userData, signOut, loading: authLoading } = useAuthStore();
  const { userOrders, subscribeUserOrders } = useOrderStore();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Theme
  const [theme, setTheme] = useState<StoredTheme>({});
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hotelTheme");
      if (stored) setTheme(JSON.parse(stored));
    } catch {}
  }, []);

  const accent = theme.accent || "#EA580C";
  const bg = theme.bg || "#F5F5F5";
  const text = theme.text || "#000000";

  // Edit states
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const user = userData?.role === "user" ? (userData as User) : null;

  // Wait for auth to finish loading before deciding to redirect
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

  // Group orders by store, sorted by most recent order
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

  // Sort stores by most recent order, show only latest store unless "show all"
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

  const handleLogout = async () => {
    await signOut();
    router.replace("/");
  };

  if (authLoading || !user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: bg }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: bg, fontFamily: "'Open Sans', sans-serif" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: accent }}
      >
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full transition-colors hover:bg-white/10"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="font-semibold text-base text-white flex-1">
          My Profile
        </h1>
        {theme.storePath && (
          <Link
            href={theme.storePath}
            className="p-2 rounded-full transition-colors hover:bg-white/10"
          >
            <UtensilsCrossed size={18} className="text-white" />
          </Link>
        )}
      </div>

      <div className="container mx-auto px-4 pb-24 pt-4 max-w-lg">
        {/* Profile Card */}
        <div
          className="rounded-xl p-5 mb-6 shadow-sm"
          style={{
            backgroundColor: `${text}06`,
            border: `1px solid ${text}12`,
          }}
        >
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${accent}15` }}
            >
              <UserIcon className="h-7 w-7" style={{ color: accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-lg font-semibold truncate"
                style={{ color: text }}
              >
                {user.full_name || "User"}
              </p>
              <p className="text-sm" style={{ color: `${text}66` }}>
                {user.phone}
              </p>
            </div>
          </div>

          {/* Name */}
          <div
            className="border-t pt-4 space-y-4"
            style={{ borderColor: `${text}15` }}
          >
            <div>
              <label
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: `${text}66` }}
              >
                Name
              </label>
              {editingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="flex-1 placeholder:text-inherit placeholder:opacity-40"
                    style={{
                      backgroundColor: `${text}06`,
                      color: text,
                      borderColor: `${text}20`,
                    }}
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSaveName}
                    disabled={savingName}
                  >
                    {savingName ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        style={{ color: accent }}
                      />
                    ) : (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingName(false);
                      setNameValue(user.full_name || "");
                    }}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm font-medium" style={{ color: text }}>
                    {user.full_name || "Not set"}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingName(true)}
                  >
                    <Edit className="h-4 w-4" style={{ color: `${text}66` }} />
                  </Button>
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: `${text}66` }}
              >
                Phone
              </label>
              {editingPhone ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={phoneValue}
                    onChange={(e) => setPhoneValue(e.target.value)}
                    className="flex-1 placeholder:text-inherit placeholder:opacity-40"
                    style={{
                      backgroundColor: `${text}06`,
                      color: text,
                      borderColor: `${text}20`,
                    }}
                    autoFocus
                    type="tel"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSavePhone}
                    disabled={savingPhone}
                  >
                    {savingPhone ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        style={{ color: accent }}
                      />
                    ) : (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingPhone(false);
                      setPhoneValue(user.phone || "");
                    }}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" style={{ color: `${text}66` }} />
                    <p className="text-sm font-medium" style={{ color: text }}>
                      {user.phone}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingPhone(true)}
                  >
                    <Edit className="h-4 w-4" style={{ color: `${text}66` }} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          className="w-full mb-6 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          style={{ backgroundColor: `${text}08`, color: "#ef4444", border: `1px solid ${text}12` }}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>

        {/* Orders by Store */}
        <div>
          <h2
            className="text-lg font-semibold mb-4 flex items-center gap-2"
            style={{ color: text }}
          >
            <ShoppingBag className="h-5 w-5" />
            My Orders
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2
                className="h-8 w-8 animate-spin"
                style={{ color: accent }}
              />
            </div>
          ) : totalStoreCount === 0 ? (
            <div
              className="text-center py-12 rounded-xl"
              style={{
                color: `${text}66`,
                backgroundColor: `${text}06`,
                border: `1px solid ${text}12`,
              }}
            >
              No orders yet
            </div>
          ) : (
            <div className="space-y-4">
              {sortedStoreEntries.map(
                ([partnerId, { storeName, currency, orders }]) => (
                  <div
                    key={partnerId}
                    className="rounded-xl overflow-hidden shadow-sm"
                    style={{
                      backgroundColor: `${text}06`,
                      border: `1px solid ${text}12`,
                    }}
                  >
                    <div
                      className="px-4 py-3 border-b flex items-center justify-between"
                      style={{
                        backgroundColor: `${text}06`,
                        borderColor: `${text}10`,
                      }}
                    >
                      <h3
                        className="font-semibold text-sm"
                        style={{ color: text }}
                      >
                        {storeName}
                      </h3>
                      <span className="text-xs" style={{ color: `${text}66` }}>
                        {orders.length} order{orders.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div>
                      {orders.slice(0, 5).map((order, idx) => {
                        const statusDisplay = getStatusDisplay(order);
                        const foodTotal = (order.items || []).reduce(
                          (sum: number, item: any) =>
                            sum + item.price * item.quantity,
                          0,
                        );
                        return (
                          <Link
                            key={order.id}
                            href={`/order/${order.id}`}
                            className="px-4 py-3 flex items-center justify-between transition-colors"
                            style={
                              idx < Math.min(orders.length, 5) - 1
                                ? { borderBottom: `1px solid ${text}10` }
                                : undefined
                            }
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-sm font-medium"
                                  style={{ color: text }}
                                >
                                  #{order.id.slice(0, 8)}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${statusDisplay.className}`}
                                >
                                  {statusDisplay.text}
                                </span>
                              </div>
                              <p
                                className="text-xs mt-0.5"
                                style={{ color: `${text}66` }}
                              >
                                {format(
                                  new Date(order.createdAt),
                                  "MMM d, h:mm a",
                                )}{" "}
                                - {order.items?.length || 0} items
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-sm font-semibold"
                                style={{ color: text }}
                              >
                                {currency}
                                {foodTotal.toFixed(2)}
                              </span>
                              <ChevronRight
                                className="h-4 w-4"
                                style={{ color: `${text}40` }}
                              />
                            </div>
                          </Link>
                        );
                      })}
                      {orders.length > 5 && (
                        <Link
                          href="/my-orders"
                          className="px-4 py-3 text-center text-sm font-medium transition-colors block"
                          style={{
                            color: accent,
                            borderTop: `1px solid ${text}10`,
                          }}
                        >
                          View all orders
                        </Link>
                      )}
                    </div>
                  </div>
                ),
              )}

              {/* Load more stores button */}
              {!showAllStores && totalStoreCount > 1 && (
                <button
                  onClick={() => setShowAllStores(true)}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
                  style={{
                    color: accent,
                    backgroundColor: `${accent}10`,
                    border: `1px solid ${accent}20`,
                  }}
                >
                  Show orders from {totalStoreCount - 1} other restaurant{totalStoreCount - 1 > 1 ? "s" : ""}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      {theme.storePath && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 border-t z-[999] px-2 py-1.5 flex justify-around items-center max-w-xl mx-auto"
          style={{ backgroundColor: bg, borderColor: `${text}15` }}
        >
          <Link
            href={`${theme.storePath}?tab=food`}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors opacity-40"
            style={{ color: text }}
          >
            <Home size={20} />
            <span className="text-[10px] font-medium">Food</span>
          </Link>
          <Link
            href={`${theme.storePath}?tab=offers`}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors opacity-40"
            style={{ color: text }}
          >
            <Tag size={20} />
            <span className="text-[10px] font-medium">Offers</span>
          </Link>
          <Link
            href={`${theme.storePath}?tab=orders`}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors opacity-40"
            style={{ color: text }}
          >
            <ShoppingBag size={20} />
            <span className="text-[10px] font-medium">Orders</span>
          </Link>
          <div
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg"
            style={{ color: accent }}
          >
            <UserIcon size={20} />
            <span className="text-[10px] font-medium">Profile</span>
          </div>
        </div>
      )}
    </div>
  );
}
