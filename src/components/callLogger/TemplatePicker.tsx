"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// A WhatsApp message template (Meta's component structure), as returned by
// /api/whatsapp/templates.
export interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION";
  text?: string;
  buttons?: Array<{ type: string; text?: string; url?: string; phone_number?: string }>;
}
export interface TemplateRow {
  name: string;
  language: string;
  category?: string | null;
  components?: TemplateComponent[] | null;
  status?: string | null;
}

const isApproved = (s?: string | null) => (s || "").toUpperCase() === "APPROVED";

/** Normalize a template's components to an array (jsonb may arrive as a string). */
function comps(t: TemplateRow | null): TemplateComponent[] {
  if (!t) return [];
  const c = t.components as unknown;
  if (Array.isArray(c)) return c as TemplateComponent[];
  if (typeof c === "string") {
    try {
      const parsed = JSON.parse(c);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** The BODY text of a template (empty string if none). */
export function bodyOf(t: TemplateRow | null): string {
  return comps(t).find((c) => c.type === "BODY")?.text ?? "";
}

/** Replace {{1}}, {{2}} … in a body with the supplied params (keeps the token if missing). */
export function fillPlaceholders(body: string, params: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_m, idx) => {
    const i = parseInt(idx, 10) - 1;
    return params[i] ? params[i] : `{{${idx}}}`;
  });
}

/** Count distinct {{n}} placeholders — how many body params the template needs. */
export function variableCount(body: string): number {
  const matches = body.match(/\{\{(\d+)\}\}/g) || [];
  const indices = new Set<number>();
  for (const m of matches) {
    const n = parseInt(m.replace(/[{}]/g, ""), 10);
    if (!Number.isNaN(n)) indices.add(n);
  }
  return indices.size;
}

/**
 * Load the partner's WhatsApp templates from cravings-v2's own templates API
 * (the same source the partner's WhatsApp Templates screen uses; sync=1 pulls
 * the latest from Meta). Approved templates are surfaced first.
 */
export function useTemplates(partnerId: string) {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/whatsapp/templates?partnerId=${encodeURIComponent(partnerId)}&sync=1`)
      .then(async (r) => {
        if (!r.ok) {
          const body = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `HTTP ${r.status}`);
        }
        return r.json() as Promise<{ templates?: TemplateRow[] }>;
      })
      .then((d) => {
        if (!alive) return;
        const list = (d.templates || []).map((t) => ({
          name: t.name,
          language: t.language,
          category: t.category ?? null,
          components: t.components ?? null,
          status: t.status ?? null,
        }));
        list.sort(
          (a, b) =>
            (isApproved(b.status) ? 1 : 0) - (isApproved(a.status) ? 1 : 0) ||
            a.name.localeCompare(b.name),
        );
        setTemplates(list);
        setError(null);
      })
      .catch((e) => {
        if (alive) setError((e as Error).message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [partnerId]);

  return { templates, loading, error };
}

/** WhatsApp-style rendering of a template's header/body/footer/buttons. */
export function TemplatePreview({ template, params = [] }: { template: TemplateRow; params?: string[] }) {
  const list = comps(template);
  const header = list.find((c) => c.type === "HEADER");
  const body = list.find((c) => c.type === "BODY");
  const footer = list.find((c) => c.type === "FOOTER");
  const buttons = list.find((c) => c.type === "BUTTONS");

  return (
    <div className="rounded-lg p-3" style={{ background: "#e5ddd5" }}>
      <div className="max-w-[240px] space-y-1.5 rounded-lg bg-white px-3 py-2 text-sm text-gray-800 shadow-sm">
        {header?.format === "TEXT" && header.text ? (
          <div className="font-semibold">{header.text}</div>
        ) : header?.format && header.format !== "TEXT" ? (
          <div className="flex h-20 items-center justify-center rounded bg-gray-100 text-[10px] font-medium uppercase tracking-wide text-gray-400">
            {header.format}
          </div>
        ) : null}

        {body?.text ? (
          <div className="whitespace-pre-wrap">{fillPlaceholders(body.text, params)}</div>
        ) : (
          <div className="italic text-gray-400">No body text</div>
        )}

        {footer?.text && <div className="text-xs text-gray-400">{footer.text}</div>}
      </div>

      {buttons?.buttons?.length ? (
        <div className="mt-1.5 max-w-[240px] space-y-1">
          {buttons.buttons.map((b, i) => (
            <div
              key={i}
              className="rounded-lg bg-white py-1.5 text-center text-sm shadow-sm"
              style={{ color: "#00a5f4" }}
            >
              {b.text || b.type}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Choose a WhatsApp template from the partner's list and preview it, instead of
 * typing the name. Falls back to a free-text input when the partner has no
 * templates (or the list can't be loaded), so nothing regresses.
 */
export default function TemplatePicker({
  partnerId,
  template,
  language,
  params = [],
  onChange,
}: {
  partnerId: string;
  template: string;
  language: string;
  params?: string[];
  onChange: (next: { template: string; language: string }) => void;
}) {
  const { templates, loading, error } = useTemplates(partnerId);
  const [manual, setManual] = useState(false);

  // Keep the currently-configured template visible even if it isn't in the
  // fetched list (e.g. a legacy typed name or the default seed).
  const options = useMemo(() => {
    if (template && !templates.some((t) => t.name === template)) {
      return [
        { name: template, language: language || "en", status: "current", components: null } as TemplateRow,
        ...templates,
      ];
    }
    return templates;
  }, [templates, template, language]);

  const selected = useMemo(
    () =>
      options.find((t) => t.name === template && t.language === language) ||
      options.find((t) => t.name === template) ||
      null,
    [options, template, language],
  );

  const useManual = manual || (!loading && templates.length === 0) || !!error;
  const varsNeeded = selected ? variableCount(bodyOf(selected)) : 0;

  return (
    <div className="space-y-2">
      {useManual ? (
        <Input
          value={template}
          onChange={(e) => onChange({ template: e.target.value, language })}
          placeholder="Approved template name"
        />
      ) : (
        <Select
          value={selected ? `${selected.name}::${selected.language}` : ""}
          onValueChange={(v) => {
            const [name, lang] = v.split("::");
            onChange({ template: name, language: lang || "en" });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={loading ? "Loading templates…" : "Select a template"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((t) => (
              <SelectItem key={`${t.name}::${t.language}`} value={`${t.name}::${t.language}`}>
                {t.name} · {t.language}
                {isApproved(t.status) ? "" : ` (${t.status || "?"})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {error ? (
          <span className="text-amber-600 dark:text-amber-500">
            Couldn&apos;t load templates — type the name manually.
          </span>
        ) : !loading && templates.length === 0 ? (
          <span>No templates found for this partner — type the name manually.</span>
        ) : (
          <button type="button" className="text-primary underline" onClick={() => setManual((m) => !m)}>
            {useManual ? "Pick from list" : "Type manually"}
          </button>
        )}
      </div>

      {selected && <TemplatePreview template={selected} params={params} />}

      {selected && varsNeeded > 0 && (
        <p className="text-xs text-muted-foreground">
          Needs {varsNeeded} body variable{varsNeeded > 1 ? "s" : ""} ({"{{1}}"}
          {varsNeeded > 1 ? `…{{${varsNeeded}}}` : ""}) — fill them in Body params below.
        </p>
      )}
    </div>
  );
}
