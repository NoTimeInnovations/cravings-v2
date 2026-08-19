"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, LogOut, Search, Settings, UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuthStore, Partner } from "@/store/authStore";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import { getNavItemState } from "@/lib/adminNav";
import { NAV_GROUPS, navItems } from "./navItems";
import { useKnownAccounts } from "./useKnownAccounts";

export function AdminV3Sidebar({
  activeView,
  onNavigate,
  onOpenSearch,
  onLogout,
  className,
}: {
  activeView: string;
  onNavigate: (view: string, id: string) => void;
  onOpenSearch: () => void;
  onLogout: () => void;
  className?: string;
}) {
  const { userData, features } = useAuthStore();
  const partner = userData as Partner | undefined;
  const [accountsOpen, setAccountsOpen] = React.useState(false);
  const accountRef = React.useRef<HTMLDivElement>(null);
  const { others } = useKnownAccounts(partner);

  React.useEffect(() => {
    if (!accountsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setAccountsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountsOpen]);

  // Same selector admin-v2's navbar uses, so the two badges never disagree.
  const pendingCount = useOrderSubscriptionStore(
    (st) => st.orders.filter((o) => o.status === "pending").length,
  );

  const visible = React.useMemo(
    () => navItems.filter((i) => getNavItemState(i.id, features, userData) !== "hidden"),
    [features, userData],
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-zinc-50 dark:bg-zinc-900", className)}>
      {/* Account card. `relative` so the menu can float over the nav rather
          than pushing every item down the list. */}
      <div ref={accountRef} className="relative px-3 pb-2.5 pt-3.5">
        <div className="flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-white p-2 pl-2.5 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700">
          {/* The Menuthere mark, not the partner's own logo: this is the
              product's chrome, and the store the account belongs to is already
              named on the line beside it. object-contain so a non-square mark
              is never cropped. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/menuthere-logo-new.svg"
            alt="Menuthere"
            className="h-8 w-8 shrink-0 rounded-md border border-zinc-200 bg-white object-contain p-0.5 dark:border-zinc-700"
          />
          <div className="min-w-0 flex-1">
            <div
              translate="no"
              className="notranslate truncate text-[13px] font-semibold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50"
            >
              {partner?.store_name || "Your store"}
            </div>
            <div
              translate="no"
              className="notranslate mt-px truncate text-[11px] font-normal leading-tight text-zinc-400 dark:text-zinc-500"
            >
              {partner?.email || ""}
            </div>
          </div>
          <button
            type="button"
            title="Accounts"
            aria-label="Accounts"
            aria-expanded={accountsOpen}
            onClick={() => setAccountsOpen((o) => !o)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
          >
            <ChevronDown
              size={15}
              strokeWidth={1.9}
              className={cn("transition-transform", accountsOpen && "rotate-180")}
            />
          </button>
        </div>

        {accountsOpen ? (
          <div className="absolute left-3 right-3 top-full z-30 -mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
            {others.length > 0 ? (
              <>
                <div className="px-3 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
                  Switch to
                </div>
                {others.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    // Signing in is what actually switches: this browser keeps
                    // no second session to restore, by design.
                    //
                    // `add=1` is the middleware's escape hatch — without it an
                    // already-authenticated visitor to /login is bounced to "/"
                    // and straight back to the dashboard, so the switcher could
                    // never reach the login form at all.
                    onClick={() => {
                      setAccountsOpen(false);
                      window.location.href = `/login?add=1&email=${encodeURIComponent(a.email)}`;
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    <span
                      translate="no"
                      className="notranslate flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                    >
                      {(a.name || a.email).slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        translate="no"
                        className="notranslate block truncate text-[12.5px] font-medium leading-tight text-zinc-950 dark:text-zinc-50"
                      >
                        {a.name || a.email}
                      </span>
                      <span
                        translate="no"
                        className="notranslate block truncate text-[11px] leading-tight text-zinc-400 dark:text-zinc-500"
                      >
                        {a.email}
                      </span>
                    </span>
                  </button>
                ))}
                <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-700" />
              </>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setAccountsOpen(false);
                window.location.href = "/login?add=1";
              }}
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[12.5px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <UserPlus size={15} strokeWidth={1.7} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
              Add account
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[12.5px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              <LogOut size={15} strokeWidth={1.7} className="shrink-0" />
              Log out
            </button>
          </div>
        ) : null}
      </div>

      {/* Search — opens the ⌘K palette. */}
      <div className="px-3 pb-1.5">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex w-full items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-zinc-500 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
        >
          <Search size={15} strokeWidth={1.7} />
          <span className="text-[12.5px] font-medium leading-none">Search</span>
          <span className="ml-auto rounded-[5px] border border-zinc-200 px-1.5 py-px text-[10.5px] font-semibold leading-normal text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            ⌘K
          </span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-2 pt-2.5">
        {NAV_GROUPS.map((group) => {
          const items = visible.filter((i) => i.group === group);
          if (items.length === 0) return null;
          return (
            <React.Fragment key={group ?? "__top"}>
              {group && (
                <div className="px-2.5 pb-1.5 pt-[15px] text-[10.5px] font-semibold uppercase leading-none tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                  {group}
                </div>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.view;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.view, item.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-[11px] rounded-md px-2.5 py-2.5 text-left text-[13.5px] leading-none transition-colors",
                      isActive
                        ? "bg-zinc-100 font-semibold text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                        : "font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                    )}
                  >
                    <Icon size={18} strokeWidth={isActive ? 1.8 : 1.7} className="shrink-0" />
                    <span className="truncate">{item.label}</span>

                    {item.id === "orders" && pendingCount > 0 && (
                      <span className="ml-auto rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold leading-none text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Settings, pinned */}
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => onNavigate("Settings", "settings")}
          className="flex w-full items-center gap-[11px] rounded-md border border-zinc-900 bg-zinc-900 px-3 py-2.5 text-zinc-50 transition-colors hover:bg-zinc-800 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <Settings size={15} strokeWidth={1.7} className="shrink-0" />
          <span className="text-[13px] font-medium leading-none">Settings</span>
          <ChevronRight size={15} strokeWidth={2} className="ml-auto shrink-0" />
        </button>
      </div>
    </div>
  );
}
