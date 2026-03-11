"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, User, Partner } from "@/store/authStore";
import useOrderStore from "@/store/orderStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updateUserFullNameMutation, updateUserPhoneMutation } from "@/api/auth";
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

  // Group orders by store
  const ordersByStore = useMemo(() => {
    const grouped: Record<string, { storeName: string; currency: string; orders: typeof userOrders }> = {};
    for (const order of userOrders) {
      const partnerId = (order as any).partnerId || (order as any).partner_id;
      const storeName = (order.partner as any)?.store_name || "Unknown Store";
      const currency = (order.partner as Partner)?.currency || "₹";
      if (!grouped[partnerId]) {
        grouped[partnerId] = { storeName, currency, orders: [] };
      }
      grouped[partnerId].orders.push(order);
    }
    return grouped;
  }, [userOrders]);

  const handleSaveName = async () => {
    if (!user || !nameValue.trim()) return;
    setSavingName(true);
    try {
      await fetchFromHasura(updateUserFullNameMutation, { id: user.id, full_name: nameValue.trim() });
      useAuthStore.setState({ userData: { ...user, full_name: nameValue.trim() } as any });
      toast.success("Name updated");
      setEditingName(false);
    } catch {
      toast.error("Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace("/");
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bg }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: bg }}>
      {/* Header */}
      <div className="border-b sticky top-0 z-50 px-4 py-3 flex items-center gap-3 shadow-sm" style={{ backgroundColor: bg, borderColor: `${text}15` }}>
        {theme.storePath ? (
          <Link
            href={theme.storePath}
            className="flex items-center gap-2 p-2 rounded-full transition-colors"
            style={{ color: accent }}
          >
            <UtensilsCrossed size={20} />
          </Link>
        ) : (
          <button onClick={() => router.back()} className="p-2 rounded-full transition-colors" style={{ color: text }}>
            <UtensilsCrossed size={20} />
          </button>
        )}
        <h1 className="font-semibold text-lg" style={{ color: text }}>My Profile</h1>
      </div>

      <div className="container mx-auto px-4 pb-8 pt-4 max-w-lg">
        {/* Profile Card */}
        <div className="rounded-xl p-5 mb-6 shadow-sm" style={{ backgroundColor: `${text}06`, border: `1px solid ${text}12` }}>
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accent}15` }}>
              <UserIcon className="h-7 w-7" style={{ color: accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold truncate" style={{ color: text }}>{user.full_name || "User"}</p>
              <p className="text-sm" style={{ color: `${text}66` }}>{user.phone}</p>
            </div>
          </div>

          {/* Name */}
          <div className="border-t pt-4 space-y-4" style={{ borderColor: `${text}15` }}>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: `${text}66` }}>Name</label>
              {editingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="flex-1 placeholder:text-inherit placeholder:opacity-40"
                    style={{ backgroundColor: `${text}06`, color: text, borderColor: `${text}20` }}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={savingName}>
                    {savingName ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: accent }} /> : <Check className="h-4 w-4 text-green-600" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditingName(false); setNameValue(user.full_name || ""); }}>
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm font-medium" style={{ color: text }}>{user.full_name || "Not set"}</p>
                  <Button size="icon" variant="ghost" onClick={() => setEditingName(true)}>
                    <Edit className="h-4 w-4" style={{ color: `${text}66` }} />
                  </Button>
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: `${text}66` }}>Phone</label>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" style={{ color: `${text}66` }} />
                  <p className="text-sm font-medium" style={{ color: text }}>{user.phone}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  style={{ borderColor: `${text}20`, color: text }}
                  onClick={async () => {
                    await signOut();
                    router.replace("/login");
                  }}
                >
                  Change Number
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="destructive"
          className="w-full mb-6"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log Out
        </Button>

        {/* Orders by Store */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: text }}>
            <ShoppingBag className="h-5 w-5" />
            My Orders
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: accent }} />
            </div>
          ) : Object.keys(ordersByStore).length === 0 ? (
            <div className="text-center py-12 rounded-xl" style={{ color: `${text}66`, backgroundColor: `${text}06`, border: `1px solid ${text}12` }}>
              No orders yet
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(ordersByStore).map(([partnerId, { storeName, currency, orders }]) => (
                <div key={partnerId} className="rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: `${text}06`, border: `1px solid ${text}12` }}>
                  <div className="px-4 py-3 border-b flex items-center justify-between" style={{ backgroundColor: `${text}06`, borderColor: `${text}10` }}>
                    <h3 className="font-semibold text-sm" style={{ color: text }}>{storeName}</h3>
                    <span className="text-xs" style={{ color: `${text}66` }}>{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
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
                          className="px-4 py-3 flex items-center justify-between transition-colors"
                          style={idx < Math.min(orders.length, 5) - 1 ? { borderBottom: `1px solid ${text}10` } : undefined}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium" style={{ color: text }}>#{order.id.slice(0, 8)}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${statusDisplay.className}`}>
                                {statusDisplay.text}
                              </span>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: `${text}66` }}>
                              {format(new Date(order.createdAt), "MMM d, h:mm a")} - {order.items?.length || 0} items
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: text }}>{currency}{foodTotal.toFixed(2)}</span>
                            <ChevronRight className="h-4 w-4" style={{ color: `${text}40` }} />
                          </div>
                        </Link>
                      );
                    })}
                    {orders.length > 5 && (
                      <Link
                        href="/my-orders"
                        className="px-4 py-3 text-center text-sm font-medium transition-colors block"
                        style={{ color: accent, borderTop: `1px solid ${text}10` }}
                      >
                        View all orders
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
