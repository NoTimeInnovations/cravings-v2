"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { VisibilityConfig, Weekday, normalizeVisibility } from "@/lib/visibility";

const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

interface Props {
  value: unknown;
  onChange: (next: VisibilityConfig) => void;
  disabled?: boolean;
  scope?: "category" | "item";
}

export function VisibilityEditor({ value, onChange, disabled, scope = "item" }: Props) {
  const config = normalizeVisibility(value);
  const hideItems = config.hideItems !== false;

  const setType = (type: "default" | "scheduled") => {
    if (type === "default") {
      onChange({ type: "default", hidden: false, hideItems });
    } else {
      onChange({
        type: "scheduled",
        days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
        from: "09:00",
        to: "22:00",
        hideItems,
      });
    }
  };

  return (
    <div className="space-y-3 p-3 rounded-md border bg-muted/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Visibility</p>
          <p className="text-xs text-muted-foreground">Control whether this appears on the menu.</p>
        </div>
        <Select
          value={config.type}
          onValueChange={(v) => setType(v as "default" | "scheduled")}
          disabled={disabled}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.type === "default" && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Hide from menu</p>
            <p className="text-xs text-muted-foreground">
              When on, customers won't see this at all.
            </p>
          </div>
          <Switch
            checked={config.hidden}
            disabled={disabled}
            onCheckedChange={(checked) => onChange({ type: "default", hidden: checked, hideItems })}
          />
        </div>
      )}

      {config.type === "scheduled" && (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Visible on these days</p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const active = config.days.includes(d.key);
                return (
                  <button
                    type="button"
                    key={d.key}
                    disabled={disabled}
                    onClick={() => {
                      const next = active
                        ? config.days.filter((x) => x !== d.key)
                        : [...config.days, d.key];
                      onChange({ ...config, days: next });
                    }}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              From
              <Input
                type="time"
                value={config.from}
                disabled={disabled}
                onChange={(e) => onChange({ ...config, from: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              To
              <Input
                type="time"
                value={config.to}
                disabled={disabled}
                onChange={(e) => onChange({ ...config, to: e.target.value })}
              />
            </label>
          </div>
          {config.from === config.to && (
            <p className="text-xs text-amber-600">From and To cannot be equal.</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-3">
        <div>
          <p className="text-sm">
            {scope === "category" ? "Hide items when not visible" : "Hide item when not visible"}
          </p>
          <p className="text-xs text-muted-foreground">
            {scope === "category"
              ? "Off: keep items in the menu but mark them as unavailable."
              : "Off: keep this item in the menu marked as unavailable when its main availability is off or its schedule isn't met."}
          </p>
        </div>
        <Switch
          checked={hideItems}
          disabled={disabled}
          onCheckedChange={(checked) => onChange({ ...config, hideItems: checked } as VisibilityConfig)}
        />
      </div>
    </div>
  );
}
