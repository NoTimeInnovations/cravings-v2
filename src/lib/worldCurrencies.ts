import CURRENCIES from "@/data/currencies.json";

export interface WorldCurrency {
    /** ISO-4217 code, e.g. "USD". Unique. */
    code: string;
    /** English display name, e.g. "US Dollar". */
    name: string;
    /** Locale symbol, e.g. "$" — falls back to the code when there's no glyph. */
    symbol: string;
}

// Every ISO-4217 currency, derived at runtime from the platform Intl data — no
// hand-maintained list. Code + English name + the locale's symbol (falls back to
// the code when there's no distinct glyph). Computed once at module load. Falls
// back to the small bundled set on the rare engine without supportedValuesOf.
function buildWorldCurrencies(): WorldCurrency[] {
    try {
        const codes: string[] =
            (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.(
                "currency",
            ) || [];
        if (!codes.length) throw new Error("no Intl currencies");
        const names = new Intl.DisplayNames(["en"], { type: "currency" });
        return codes.map((code) => {
            let symbol = code;
            try {
                const parts = new Intl.NumberFormat("en", {
                    style: "currency",
                    currency: code,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }).formatToParts(0);
                symbol = parts.find((p) => p.type === "currency")?.value || code;
            } catch {
                /* keep code as symbol */
            }
            let name = code;
            try {
                name = names.of(code) || code;
            } catch {
                /* keep code as name */
            }
            return { code, name, symbol };
        });
    } catch {
        return (CURRENCIES as Array<{ label: string; value: string }>).map((c) => ({
            code: c.label,
            name: c.label,
            symbol: c.value,
        }));
    }
}

export const WORLD_CURRENCIES: WorldCurrency[] = buildWorldCurrencies();

/**
 * SearchableSelect options for every world currency. The stored value is the
 * SYMBOL — matching the rest of the app, where `partner.currency` is a display
 * symbol (₹ / $ / €). Searchable by code, name and symbol.
 */
export const CURRENCY_OPTIONS = WORLD_CURRENCIES.map((c) => ({
    value: c.symbol,
    label: `${c.code} — ${c.name}`,
    hint: c.symbol,
    keywords: `${c.code} ${c.name} ${c.symbol}`,
}));
