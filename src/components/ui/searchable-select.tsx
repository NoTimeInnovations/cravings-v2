"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface SearchableSelectOption {
    /** The value stored/emitted when this option is picked. */
    value: string;
    /** Primary text shown in the list and (when selected) in the trigger. */
    label: string;
    /** Optional right-aligned secondary text (e.g. a symbol or GMT offset). */
    hint?: string;
    /** Extra text folded into the search index but not displayed. */
    keywords?: string;
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    id?: string;
    /** Cap on how many options are rendered at once (perf for huge lists). */
    maxResults?: number;
    className?: string;
}

/**
 * A robust, keyboard-accessible searchable dropdown for large option sets
 * (world currencies, IANA timezones, …). Filters on label + value + hint +
 * keywords (all query tokens must match), supports ↑/↓/Enter/Esc, closes on
 * outside-click, focuses the search box on open, and gracefully renders a
 * value that isn't in `options` (legacy / custom entries).
 */
export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Select…",
    searchPlaceholder = "Search…",
    emptyText = "No match found",
    disabled = false,
    id,
    maxResults = 100,
    className,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlight, setHighlight] = useState(0);
    const wrapRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Precompute a lowercase search haystack per option once.
    const indexed = useMemo(
        () =>
            options.map((o) => ({
                option: o,
                haystack: `${o.label} ${o.value} ${o.hint ?? ""} ${o.keywords ?? ""}`.toLowerCase(),
            })),
        [options],
    );

    const filtered = useMemo(() => {
        const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const matches = tokens.length
            ? indexed.filter(({ haystack }) => tokens.every((t) => haystack.includes(t)))
            : indexed;
        return matches.slice(0, maxResults).map((m) => m.option);
    }, [indexed, query, maxResults]);

    const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);
    // Show a real selection's label; fall back to the raw value for legacy/custom
    // entries not present in the option list, else the placeholder.
    const triggerLabel = value ? selected?.label ?? value : "";

    // Close + reset when clicking outside.
    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    // On open: focus the search box and highlight the current selection (if visible).
    useEffect(() => {
        if (!open) return;
        inputRef.current?.focus();
        const idx = filtered.findIndex((o) => o.value === value);
        setHighlight(idx >= 0 ? idx : 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Keep the highlight in range and re-clamp as the filtered set changes.
    useEffect(() => {
        setHighlight((h) => (h >= filtered.length ? 0 : h));
    }, [filtered.length]);

    // Scroll the highlighted row into view.
    useEffect(() => {
        if (!open || !listRef.current) return;
        const el = listRef.current.children[highlight] as HTMLElement | undefined;
        el?.scrollIntoView({ block: "nearest" });
    }, [highlight, open]);

    const commit = (opt: SearchableSelectOption) => {
        onChange(opt.value);
        setOpen(false);
        setQuery("");
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const opt = filtered[highlight];
            if (opt) commit(opt);
        } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            setQuery("");
        }
    };

    return (
        <div className={cn("relative", className)} ref={wrapRef}>
            {open ? (
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        ref={inputRef}
                        id={id}
                        autoComplete="off"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls={id ? `${id}-listbox` : undefined}
                        placeholder={searchPlaceholder}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        className="pl-9"
                    />
                </div>
            ) : (
                <button
                    type="button"
                    id={id}
                    disabled={disabled}
                    onClick={() => setOpen(true)}
                    role="combobox"
                    aria-expanded="false"
                    className={cn(
                        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        !value && "text-muted-foreground",
                    )}
                >
                    <span className="truncate">{triggerLabel || placeholder}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
            )}

            {open && (
                <ul
                    ref={listRef}
                    id={id ? `${id}-listbox` : undefined}
                    role="listbox"
                    className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-md"
                >
                    {filtered.length === 0 && (
                        <li className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</li>
                    )}
                    {filtered.map((o, i) => {
                        const isSelected = o.value === value;
                        const isActive = i === highlight;
                        return (
                            <li key={`${o.value}-${i}`} role="option" aria-selected={isSelected}>
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        // onMouseDown (not onClick) so it fires before the
                                        // input's blur/outside-click handler closes us.
                                        e.preventDefault();
                                        commit(o);
                                    }}
                                    onMouseEnter={() => setHighlight(i)}
                                    className={cn(
                                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                                        isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                                    )}
                                >
                                    <Check
                                        className={cn(
                                            "h-4 w-4 shrink-0",
                                            isSelected ? "opacity-100" : "opacity-0",
                                        )}
                                    />
                                    <span className="flex-1 truncate">{o.label}</span>
                                    {o.hint && (
                                        <span className="ml-2 shrink-0 text-muted-foreground">{o.hint}</span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
