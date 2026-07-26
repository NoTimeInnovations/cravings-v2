"use client";

import { Globe, Loader2, MapPin, Sparkles, UtensilsCrossed } from "lucide-react";
import type { AddRestaurantForm, DraftItem } from "./types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 flex-1 break-words text-right text-sm text-foreground">
        {value || "—"}
      </span>
    </div>
  );
}

/**
 * Step 5 — one last look before anything is written. Creation is a single
 * server call that can run for the better part of a minute (Google photos, AI
 * website copy, partner + categories + menu inserts), so the button doubles as
 * the progress indicator.
 */
export function StepReview({
  form,
  items,
  creating,
}: {
  form: AddRestaurantForm;
  items: DraftItem[];
  creating: boolean;
}) {
  const withImages = items.filter((i) => i.image_url).length;
  const categories = new Set(items.map((i) => i.category || "Menu")).size;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-input p-3">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          <Globe className="h-3.5 w-3.5" /> Business
        </p>
        <Row label="Name" value={form.name} />
        <Row label="Email" value={form.email} />
        <Row label="Phone" value={`${form.phoneCode} ${form.phone}`} />
        <Row label="Country" value={`${form.country} · ${form.currency}`} />
      </div>

      <div className="rounded-xl border border-input p-3">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> Location
        </p>
        <Row label="Address" value={form.address} />
        <Row
          label="Pin"
          value={
            form.lat != null && form.lng != null
              ? `${form.lat.toFixed(5)}, ${form.lng.toFixed(5)}`
              : ""
          }
        />
      </div>

      <div className="rounded-xl border border-input p-3">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          <UtensilsCrossed className="h-3.5 w-3.5" /> Menu
        </p>
        <Row
          label="Items"
          value={
            items.length
              ? `${items.length} in ${categories} categor${categories === 1 ? "y" : "ies"}`
              : ""
          }
        />
        <Row
          label="Images"
          value={items.length ? `${withImages} of ${items.length}` : ""}
        />
        {!items.length && form.placeId && (
          // quickSignupFromGoogle seeds a small sample menu when it gets no
          // items, so the new page isn't empty. Say so rather than surprise them.
          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
            No items added — a short starter menu will be created from the
            listing&apos;s cuisine type.
          </p>
        )}
      </div>

      {form.placeId && (
        <div className="flex items-start gap-2.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 dark:border-orange-900/40 dark:bg-orange-900/15">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
          <p className="text-[11px] leading-relaxed text-orange-900 dark:text-orange-200">
            Built from the Google listing, so it also gets a banner photo and a
            written-up website. That takes longer — leave this open.
          </p>
        </div>
      )}

      {creating && (
        <p className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Creating the account, menu and marketplace link…
        </p>
      )}
    </div>
  );
}
