"use client";

import * as React from "react";
import { ChevronRight, Loader2, Pencil, SquareArrowOutUpRight } from "lucide-react";
import { toast } from "sonner";

import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { useAuthStore } from "@/store/authStore";

import { AdminV3Button } from "../ui/primitives";
import { useV3Navigate } from "../useV3Navigate";
import { useWhatsAppStatus } from "../dashboard/useWhatsAppStatus";
import {
  Chip,
  FieldRow,
  Note,
  SettingsCard,
  StateChip,
  TextField,
  Toggle,
  ToggleRow,
  parseJson,
  useSectionDraft,
} from "./controls";
import { useFeatureToggle } from "./ModulesSection";

/* ------------------------------------------------------------------ draft */

interface IntegrationsDraft {
  gtm_container_id: string;
}

function readSocial(raw: unknown): Record<string, any> {
  if (typeof raw === "string" && raw.trim() && !raw.trim().startsWith("{")) {
    return { instagram: raw.trim() };
  }
  return parseJson(raw);
}

function read(partner: any): IntegrationsDraft {
  const social = readSocial(partner?.social_links);
  return {
    gtm_container_id: partner?.gtm_container_id || "",
  };
}

function build(d: IntegrationsDraft, partner: any): Record<string, unknown> {
  const social = readSocial(partner?.social_links);
  return {
    gtm_container_id: d.gtm_container_id.trim() || null,
    // The delivery-platform links are edited in the classic dashboard now; this
    // section no longer shows them, so it must not write them either — spread
    // preserves whatever is stored.
    social_links: { ...social },
  };
}

/* ------------------------------------------------------------- connections */

const V2_INTEGRATIONS = "/admin-v2?view=Settings&sg=integrations&ss=integrations";

function ConnectionRow({
  name,
  note,
  status,
  tone,
  toggle,
  href,
  onAction,
  action,
  trailing,
}: {
  name: string;
  note: string;
  status: string;
  tone: "green" | "amber" | "neutral";
  toggle?: React.ReactNode;
  href?: string;
  /** In-app navigation instead of an outbound link. Wins over href. */
  onAction?: () => void;
  action?: string;
  /** A control that is not an outbound link — Petpooja's inline id editor. */
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
      <div className="min-w-0 flex-[1_1_220px]">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            {name}
          </span>
          <StateChip tone={tone}>{status}</StateChip>
        </div>
        <div className="mt-1.5 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
          {note}
        </div>
      </div>
      {toggle}
      {trailing}
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-[30px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          {action || "Open"}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : href ? (
        <a
          href={href}
          className="inline-flex h-[30px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          {action || "Open"}
          <SquareArrowOutUpRight className="h-3 w-3" />
        </a>
      ) : null}
    </div>
  );
}

function useGoogleBusiness(partnerId?: string) {
  const [state, setState] = React.useState<"loading" | "connected" | "off">("loading");
  React.useEffect(() => {
    let alive = true;
    if (!partnerId) {
      setState("off");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `/api/google-business/locations?partnerId=${partnerId}&mode=partner`,
        );
        const json = await res.json().catch(() => null);
        if (!alive) return;
        setState(res.ok && json?.success ? "connected" : "off");
      } catch {
        if (alive) setState("off");
      }
    })();
    return () => {
      alive = false;
    };
  }, [partnerId]);
  return state;
}

/* ----------------------------------------------------------------- screen */

export function IntegrationsSection() {
  const { partner, draft, patch } = useSectionDraft(
    read,
    build,
    "Integration settings saved",
  );
  const { status: whatsapp } = useWhatsAppStatus();
  const navigate = useV3Navigate();
  const google = useGoogleBusiness(partner?.id);
  const { features, toggle, busy } = useFeatureToggle();

  const petpoojaId = partner?.petpooja_restaurant_id;

  /**
   * The Petpooja id is a partner column, not part of this section's draft, so
   * it writes on its own. Only offered while UNSET: changing the id of a live
   * integration re-points menu and order sync at a different restaurant, which
   * is a staff operation, not a self-serve one.
   */
  /**
   * Same shape as the FSSAI toggle: there is no "GTM enabled" column — the
   * storefront injects the container whenever the id is non-empty (see
   * src/app/[username]/layout.tsx). So the switch IS the id; turning it off
   * clears it, and the cleared value is held so flipping back on restores it.
   */
  const [gtmOn, setGtmOn] = React.useState(!!draft.gtm_container_id);
  const clearedGtm = React.useRef("");
  React.useEffect(() => {
    if (draft.gtm_container_id) setGtmOn(true);
  }, [draft.gtm_container_id]);

  const setPartnerState = useAuthStore((st) => st.setState);
  const [ppEditing, setPpEditing] = React.useState(false);
  const [ppValue, setPpValue] = React.useState("");
  const [ppSaving, setPpSaving] = React.useState(false);

  const savePetpooja = async () => {
    const id = ppValue.trim();
    if (!id || !partner?.id || ppSaving) return;
    setPpSaving(true);
    try {
      await updatePartner(partner.id, { petpooja_restaurant_id: id });
      await revalidateTag(partner.id);
      setPartnerState({ petpooja_restaurant_id: id } as any);
      setPpEditing(false);
      setPpValue("");
      toast.success("Petpooja restaurant ID saved");
    } catch (e) {
      console.error("[v3 integrations] petpooja save failed:", e);
      toast.error("Could not save the restaurant ID");
    } finally {
      setPpSaving(false);
    }
  };

  return (
    <>
      <SettingsCard
        title="Connections"
        meta={<Chip>Each switch lives with its connection</Chip>}
        bodyClassName="gap-0 p-0"
      >
        <ConnectionRow
          name="WhatsApp Business"
          note={
            whatsapp?.connected
              ? `Sending from ${whatsapp.displayPhone || "your connected number"}${
                  whatsapp.flowsTotal
                    ? ` · ${whatsapp.flowsActive} of ${whatsapp.flowsTotal} flows on`
                    : ""
                }`
              : "Order updates, the ordering link and automatic replies."
          }
          status={
            whatsapp == null ? "Checking…" : whatsapp.connected ? "Connected" : "Not connected"
          }
          tone={whatsapp?.connected ? "green" : "neutral"}
          toggle={
            features?.whatsappnotifications?.access ? (
              <Toggle
                label="WhatsApp notifications"
                checked={features.whatsappnotifications.enabled}
                disabled={busy === "whatsappnotifications"}
                onChange={(v) => toggle("whatsappnotifications", v)}
              />
            ) : undefined
          }
          onAction={() => navigate("WhatsApp", "wa=numbers")}
          action={whatsapp?.connected ? "Manage" : "Connect"}
        />

        <ConnectionRow
          name="Google Business Profile"
          note="Push your menu and photos to your Google listing."
          status={
            google === "loading" ? "Checking…" : google === "connected" ? "Connected" : "Not connected"
          }
          tone={google === "connected" ? "green" : "neutral"}
          href={
            partner?.id
              ? // The OAuth login route itself — the button used to open
                // admin-v2's settings page, which starts nothing. `redirect`
                // brings the callback back to this tab.
                `/api/google-business/auth/login?partnerId=${encodeURIComponent(partner.id)}&redirect=${encodeURIComponent("/admin-v3?sg=integrations")}`
              : undefined
          }
          action={google === "connected" ? "Manage" : "Connect"}
        />

        {/* No outbound link: there is nothing to "open" for Petpooja — the
            connection IS the restaurant id. Unset, it can be entered here. */}
        <ConnectionRow
          name="Petpooja"
          note={
            petpoojaId
              ? `Restaurant ${petpoojaId} · menu and orders sync with your POS.`
              : "Sync menu and orders with a Petpooja POS."
          }
          status={petpoojaId ? "Connected" : "Not connected"}
          tone={petpoojaId ? "green" : "neutral"}
          trailing={
            petpoojaId ? undefined : ppEditing ? undefined : (
              <AdminV3Button
                variant="secondary"
                className="h-[30px] shrink-0 px-3 text-[13px]"
                onClick={() => setPpEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </AdminV3Button>
            )
          }
        />

        {!petpoojaId && ppEditing ? (
          <div className="flex flex-wrap items-end gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <label className="min-w-0 flex-[1_1_240px]">
              <span className="block text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                Petpooja restaurant ID
              </span>
              <input
                autoFocus
                type="text"
                translate="no"
                value={ppValue}
                onChange={(e) => setPpValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void savePetpooja();
                  if (e.key === "Escape") setPpEditing(false);
                }}
                placeholder="e.g. se1aw7yt32"
                className="notranslate mt-1.5 h-9 w-full rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] font-normal leading-none text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
              />
            </label>
            <div className="flex gap-2">
              <AdminV3Button
                variant="secondary"
                className="h-9 px-3 text-[13px]"
                onClick={() => setPpEditing(false)}
              >
                Cancel
              </AdminV3Button>
              <AdminV3Button
                variant="primary"
                className="h-9 px-3.5 text-[13px] font-medium"
                disabled={ppSaving || !ppValue.trim()}
                onClick={savePetpooja}
              >
                {ppSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save
              </AdminV3Button>
            </div>
          </div>
        ) : null}

        <div className="px-4 py-3">
          <Note>
            Google sign-in opens Google&rsquo;s consent screen and returns here.
            Switches on this page save immediately.
          </Note>
        </div>
      </SettingsCard>

      <SettingsCard title="Google Tag Manager">
        <ToggleRow
          title="Use Google Tag Manager"
          desc="Runs your container on the storefront so your tags fire."
          checked={gtmOn}
          onChange={(v) => {
            setGtmOn(v);
            if (v) {
              if (clearedGtm.current) patch({ gtm_container_id: clearedGtm.current });
            } else {
              clearedGtm.current = draft.gtm_container_id;
              patch({ gtm_container_id: "" });
            }
          }}
          divider={gtmOn}
        />
        {gtmOn ? (
          <>
            <FieldRow>
              <TextField
                label="Container ID"
                hint="loaded on your storefront"
                value={draft.gtm_container_id}
                onChange={(v) => patch({ gtm_container_id: v })}
                placeholder="GTM-XXXXXXX"
                translateNo
                basis="100%"
              />
            </FieldRow>
            <Note>
              Custom domains load GTM differently from menuthere.com addresses —
              check your tags fire on the address customers actually use.
            </Note>
          </>
        ) : null}
      </SettingsCard>
    </>
  );
}
