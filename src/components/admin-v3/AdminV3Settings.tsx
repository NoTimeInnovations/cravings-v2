"use client";

import * as React from "react";
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  Gift,
  Loader2,
  Palette,
  Plug,
  Printer,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Store,
} from "lucide-react";

import { getFeatures, type FeatureFlags } from "@/lib/getFeatures";
import { getBillLayout } from "@/lib/printLayout";
import { parseOrderTypesEnabled } from "@/lib/prebooking";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { useAuthStore } from "@/store/authStore";

import { AdminV3Button, V3Card } from "./ui/primitives";
import {
  Chip,
  Segmented,
  SettingsSubPageProvider,
  parseJson,
  type SettingsSubPage,
} from "./settings/controls";
import { HOURS_TABS, HoursSection, type HoursTab } from "./settings/HoursSection";
import { IntegrationsSection } from "./settings/IntegrationsSection";
import { ModulesSection } from "./settings/ModulesSection";
import {
  OrderingSection,
  orderingTabs,
  type OrderingTab,
} from "./settings/OrderingSection";
import {
  PAYMENTS_TABS,
  PaymentsSection,
  type PaymentsTab,
} from "./settings/PaymentsSection";
import {
  PRINTING_TABS,
  PrintingSection,
  type PrintingTab,
} from "./settings/PrintingSection";
import {
  PROFILE_TABS,
  ProfileSection,
  type ProfileTab,
} from "./settings/ProfileSection";
import {
  STOREFRONT_TABS,
  StorefrontSection,
  type StorefrontTab,
} from "./settings/StorefrontSection";

/**
 * admin-v3 Settings.
 *
 * A hub of section cards that opens one section at a time, each section a strip
 * of tabs over one card — the design's shape, and the same section→save model
 * admin-v2 uses. Every section registers ONE save action on
 * `useAdminSettingsStore`; this file renders the single Save button for it in
 * the section header (v2 floated it bottom-right). The write itself is always
 * `updatePartner` → `revalidateTag` → `setState`, in `settings/controls.tsx`.
 *
 * Two things deliberately do NOT go through that Save, because both are
 * immediate-effect switches that must not wait: the store open/closed master
 * switch (also owned by the header) and the feature-flag modules, which are a
 * CSV string a deferred save could clobber.
 *
 * Deep links: `?sg=<section>&ss=<tab>` are read on mount and written back with
 * `history.replaceState` — not the Next router, so this screen needs no Suspense
 * boundary and never re-renders the shell on a tab change. admin-v2's own sg/ss
 * keys (`store`, `appearance`, `bill-printing`, …) are aliased onto the v3 ones,
 * so the existing quick-action links keep landing on the right screen.
 */

/* ---------------------------------------------------------------- sections */

type SectionKey =
  | "profile"
  | "ordering"
  | "payments"
  | "storefront"
  | "printing"
  | "integrations"
  | "modules";

interface SectionDef {
  key: SectionKey;
  name: string;
  hint: string;
  icon: React.ElementType;
  /** Extra words folded into the hub search. */
  keywords: string;
  tabs: (features: FeatureFlags | null) => { value: string; label: string }[];
  meta?: (partner: any, features: FeatureFlags | null) => string | null;
  visible?: (features: FeatureFlags | null) => boolean;
}

const MENU_STYLE_NAME: Record<string, string> = {
  default: "Default",
  compact: "Compact",
  sidebar: "Sidebar",
  v3: "V3",
  v4: "V4",
  v5: "V5 Zom",
  v6: "Grocery",
};

const BILL_LAYOUT_NAME: Record<string, string> = {
  default: "Default",
  invoice: "Tax Invoice",
  uae: "UAE Invoice",
};

const SECTIONS: SectionDef[] = [
  {
    key: "profile",
    name: "Store profile",
    hint: "Name, contact numbers, address, currency, opening hours and social links.",
    icon: Store,
    keywords:
      "name tagline phone whatsapp address city state currency timezone language instagram facebook hours open closed schedule weekly holiday timings special dates",
    // "Accepting orders" is deliberately dropped: it is the master open/closed
    // switch, and the header already carries it on every screen — a second copy
    // one level deep in Settings was only ever a duplicate.
    tabs: () => [...PROFILE_TABS, ...HOURS_TABS.filter((t) => t.value !== "status")],
    meta: (p) => p?.currency || "₹",
  },
  {
    key: "ordering",
    name: "Ordering",
    hint: "Order types, packing charges, prebooking, checkout rules and delivery.",
    icon: ShoppingBag,
    keywords: "delivery takeaway dine-in packing parcel prebooking slot radius minimum order rider bridge porter rapido",
    tabs: (f) => orderingTabs(f),
    meta: (p) => {
      const t = parseOrderTypesEnabled(p?.order_types_enabled);
      const n = [t.delivery, t.takeaway, t.dine_in].filter(Boolean).length;
      return `${n} of 3 types on`;
    },
    visible: (f) => !!(f?.ordering?.access || f?.delivery?.access),
  },
  {
    key: "payments",
    name: "Payments & tax",
    hint: "How customers pay, your gateway, tax rate and legal details.",
    icon: CreditCard,
    keywords: "cash upi qr online cashfree razorpay gst vat trn fssai legal invoice",
    tabs: () => PAYMENTS_TABS,
    meta: (p) => ((p?.gst_percentage || 0) > 0 ? `Tax ${p.gst_percentage}%` : null),
  },
  {
    key: "storefront",
    name: "Appearance",
    hint: "Logo, announcement bar, menu layout, brand colour and your domain.",
    icon: Palette,
    keywords: "storefront logo banner announcement theme layout colour brand info page cuisine city domain app links",
    tabs: () => STOREFRONT_TABS,
    meta: (p) => {
      const theme = parseJson(p?.theme);
      return MENU_STYLE_NAME[theme?.menuStyle || "default"] || null;
    },
  },
  {
    key: "printing",
    name: "Printing",
    hint: "What goes on the bill and the KOT, and when they print.",
    icon: Printer,
    keywords: "bill kot receipt printer arabic invoice auto print logo qr",
    tabs: () => PRINTING_TABS,
    meta: (p) => BILL_LAYOUT_NAME[getBillLayout(p?.delivery_rules)] || null,
  },
  {
    key: "integrations",
    name: "Integrations",
    hint: "WhatsApp, Google, Petpooja, delivery platforms and analytics tags.",
    icon: Plug,
    keywords: "whatsapp google business petpooja zomato swiggy uber eats talabat doordash gtm tag manager",
    tabs: () => [],
  },
  {
    key: "modules",
    name: "Features",
    hint: "Show or hide whole sections of your dashboard and storefront.",
    icon: SlidersHorizontal,
    keywords: "features modules pos captain stock purchases website enable disable",
    tabs: () => [],
  },
];

/* ------------------------------------------------------------- deep links */

/** admin-v2's `sg` group keys, mapped onto v3 sections. */
const GROUP_ALIAS: Record<string, SectionKey> = {
  store: "profile",
  // Hours used to be its own section; its schedule tabs are Store profile's now.
  hours: "profile",
  ordering: "ordering",
  prebooking: "ordering",
  appearance: "storefront",
  integrations: "integrations",
  features: "modules",
};

/** admin-v2's `ss` section keys, mapped onto a v3 section + tab. */
const TAB_ALIAS: Record<string, [SectionKey, string]> = {
  general: ["profile", "details"],
  "bill-printing": ["printing", "content"],
  "order-lock": ["ordering", "checkout"],
  "order-types": ["ordering", "types"],
  delivery: ["ordering", "delivery"],
  prebooking: ["ordering", "scheduled"],
  "slot-booking": ["ordering", "scheduled"],
  payment: ["payments", "methods"],
  branding: ["storefront", "brand"],
  theme: ["storefront", "look"],
  storefront: ["storefront", "brand"],
  "info-page": ["storefront", "info"],
  integrations: ["integrations", ""],
  webhooks: ["integrations", ""],
  api: ["integrations", ""],
  shiprocket: ["integrations", ""],
  features: ["modules", ""],
};

function readUrl(): { section: SectionKey | null; tab: string } {
  if (typeof window === "undefined") return { section: null, tab: "" };
  const p = new URLSearchParams(window.location.search);
  const sg = p.get("sg") || "";
  const ss = p.get("ss") || "";

  const byTab = TAB_ALIAS[ss];
  if (byTab) return { section: byTab[0], tab: byTab[1] || ss };

  const direct = SECTIONS.find((s) => s.key === sg);
  if (direct) return { section: direct.key, tab: ss };

  const alias = GROUP_ALIAS[sg];
  if (alias) return { section: alias, tab: ss };

  return { section: null, tab: "" };
}

function writeUrl(section: SectionKey | null, tab: string) {
  if (typeof window === "undefined") return;
  const p = new URLSearchParams(window.location.search);
  if (section) p.set("sg", section);
  else p.delete("sg");
  if (section && tab) p.set("ss", tab);
  else p.delete("ss");
  const qs = p.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${qs ? `?${qs}` : ""}`,
  );
}

/* ------------------------------------------------------------------ screen */

export function AdminV3Settings() {
  const userData = useAuthStore((s) => s.userData);
  const partner = userData as any;
  const features = React.useMemo(
    () => getFeatures(partner?.feature_flags || null),
    [partner?.feature_flags],
  );

  const sections = React.useMemo(
    () => SECTIONS.filter((s) => (s.visible ? s.visible(features) : true)),
    [features],
  );

  const [query, setQuery] = React.useState("");
  const [section, setSection] = React.useState<SectionKey | null>(null);
  const [tab, setTab] = React.useState("");

  const saveAction = useAdminSettingsStore((s) => s.saveAction);
  const isSaving = useAdminSettingsStore((s) => s.isSaving);
  const hasChanges = useAdminSettingsStore((s) => s.hasChanges);

  // Deep link in, once, plus browser back/forward.
  React.useEffect(() => {
    const apply = () => {
      const { section: s, tab: t } = readUrl();
      setSection(s);
      setTab(t);
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);

  // A section can take the whole screen over (the map picker). It declares
  // itself through SettingsSubPageProvider; the breadcrumb, the tab bar and the
  // back arrow below all key off this. See useDeclareSubPage in ./settings/controls.
  const [subPage, setSubPage] = React.useState<SettingsSubPage | null>(null);
  // Identity has to be stable: useDeclareSubPage lists it as an effect dep, and
  // a new function each render would re-declare on every render forever.
  const declareSubPage = React.useCallback(
    (p: SettingsSubPage | null) => setSubPage(p),
    [],
  );

  const active = sections.find((s) => s.key === section) ?? null;
  const tabs = active ? active.tabs(features) : [];
  const activeTab = tabs.find((t) => t.value === tab)?.value ?? tabs[0]?.value ?? "";

  // A section holding unsaved edits is one click away from losing them, and the
  // partner has no undo — so leaving asks first.
  const confirmLeave = () => {
    if (!hasChanges) return true;
    return window.confirm("You have unsaved changes. Leave without saving?");
  };

  const openSection = (key: SectionKey) => {
    const def = sections.find((s) => s.key === key);
    const first = def ? def.tabs(features)[0]?.value ?? "" : "";
    setSection(key);
    setTab(first);
    writeUrl(key, first);
  };

  const closeSection = () => {
    if (!confirmLeave()) return;
    setSection(null);
    setTab("");
    writeUrl(null, "");
  };

  const selectTab = (value: string) => {
    setTab(value);
    writeUrl(section, value);
  };

  /* ------------------------------------------------------------------ hub */

  if (!active) {
    const q = query.trim().toLowerCase();
    const shown = q
      ? sections.filter((s) =>
          `${s.name} ${s.hint} ${s.keywords}`.toLowerCase().includes(q),
        )
      : sections;

    return (
      <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
        <div className="px-3.5 lg:px-0">
          <div className="flex h-[38px] max-w-[360px] items-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-800">
            <Search className="h-[15px] w-[15px] shrink-0 text-zinc-400 dark:text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search settings"
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] leading-none text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="px-3.5 py-8 text-center text-[13px] text-zinc-500 dark:text-zinc-400 lg:px-0">
            Nothing matches “{query}”.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {shown.map((s) => {
              const Icon = s.icon;
              const meta = s.meta ? s.meta(partner, features) : null;
              return (
                <V3Card key={s.key} className="p-0 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                  <button
                    type="button"
                    onClick={() => openSection(s.key)}
                    className="flex h-full w-full flex-col items-start gap-2.5 p-4 text-left"
                  >
                    <div className="flex w-full items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                        {s.name}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
                    </div>
                    <span className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
                      {s.hint}
                    </span>
                    {meta ? <Chip>{meta}</Chip> : null}
                  </button>
                </V3Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* -------------------------------------------------------------- section */

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      <div className="flex flex-wrap items-center gap-3 gap-y-2.5 px-3.5 lg:px-0">
        <button
          type="button"
          onClick={subPage ? subPage.onBack : closeSection}
          aria-label={subPage ? `Back to ${active.name}` : "Back to settings"}
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft className="h-[17px] w-[17px]" />
        </button>

        <div className="min-w-0 flex-[1_1_220px]">
          <div className="flex flex-wrap items-center gap-[7px]">
            <button
              type="button"
              onClick={closeSection}
              className="text-[12.5px] font-medium leading-none text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Settings
            </button>
            <span className="text-zinc-300 dark:text-zinc-600">/</span>
            {subPage ? (
              <>
                <button
                  type="button"
                  onClick={subPage.onBack}
                  className="text-[12.5px] font-medium leading-none text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  {active.name}
                </button>
                <span className="text-zinc-300 dark:text-zinc-600">/</span>
                <span className="text-[16px] font-semibold leading-none tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
                  {subPage.title}
                </span>
              </>
            ) : (
              <span className="text-[16px] font-semibold leading-none tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
                {active.name}
              </span>
            )}
          </div>
          <div className="mt-1.5 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
            {subPage ? subPage.hint : active.hint}
          </div>
        </div>

        {hasChanges ? <Chip>Unsaved changes</Chip> : null}
        {hasChanges && saveAction ? (
          <AdminV3Button
            variant="primary"
            className="h-[34px] shrink-0 px-3.5 text-[13px] font-medium"
            disabled={isSaving}
            onClick={() => {
              void saveAction();
            }}
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isSaving ? "Saving…" : "Save changes"}
          </AdminV3Button>
        ) : null}
      </div>

      {tabs.length > 1 && !subPage ? (
        <div className="px-3.5 lg:px-0">
          <Segmented value={activeTab} onChange={selectTab} options={tabs} />
        </div>
      ) : null}

      <SettingsSubPageProvider value={declareSubPage}>
      <div className="flex flex-col gap-3.5">
        {active.key === "profile" &&
          (activeTab === "weekly" || activeTab === "special" ? (
            <HoursSection tab={activeTab as HoursTab} />
          ) : (
            <ProfileSection tab={activeTab as ProfileTab} />
          ))}
        {active.key === "ordering" && <OrderingSection tab={activeTab as OrderingTab} />}
        {active.key === "payments" && <PaymentsSection tab={activeTab as PaymentsTab} />}
        {active.key === "storefront" && (
          <StorefrontSection tab={activeTab as StorefrontTab} />
        )}
        {active.key === "printing" && <PrintingSection tab={activeTab as PrintingTab} />}
        {active.key === "integrations" && <IntegrationsSection />}
        {active.key === "modules" && <ModulesSection />}
      </div>
      </SettingsSubPageProvider>
    </div>
  );
}
