export interface TimezoneEntry {
    /** IANA identifier, e.g. "Asia/Kolkata" — this is what gets stored. */
    value: string;
    /** Readable label (underscores → spaces), e.g. "Asia/Kolkata". */
    label: string;
    /** Current GMT offset, e.g. "GMT+5:30". Empty if the engine can't resolve it. */
    offset: string;
}

// A small fallback covering the previously-hardcoded set, used only on the rare
// engine without Intl.supportedValuesOf("timeZone").
const FALLBACK_ZONES = [
    "UTC",
    "Asia/Kolkata",
    "Asia/Dubai",
    "Asia/Singapore",
    "Asia/Bangkok",
    "Asia/Tokyo",
    "Europe/London",
    "Europe/Paris",
    "America/New_York",
    "America/Los_Angeles",
    "Australia/Sydney",
];

// Resolve the current short GMT offset for a zone (e.g. "GMT+5:30"). Reflects
// DST as of module load. Returns "" when the engine can't format the zone.
function offsetFor(timeZone: string): string {
    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone,
            timeZoneName: "shortOffset",
        }).formatToParts(new Date());
        return parts.find((p) => p.type === "timeZoneName")?.value || "";
    } catch {
        return "";
    }
}

// Every IANA timezone the platform knows (~400+), each with its readable label
// and current GMT offset. Computed once at module load. UTC is always present.
function buildTimezones(): TimezoneEntry[] {
    let zones: string[] = [];
    try {
        zones =
            (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.(
                "timeZone",
            ) || [];
    } catch {
        /* fall through to fallback */
    }
    if (!zones.length) zones = FALLBACK_ZONES;
    if (!zones.includes("UTC")) zones = ["UTC", ...zones];

    return zones.map((tz) => ({
        value: tz,
        label: tz.replace(/_/g, " "),
        offset: offsetFor(tz),
    }));
}

export const TIMEZONES: TimezoneEntry[] = buildTimezones();

/**
 * SearchableSelect options for every timezone. Stored value is the IANA id
 * (what the visibility / scheduling helpers expect). Searchable by name and
 * offset (e.g. "kolkata", "GMT+5:30").
 */
export const TIMEZONE_OPTIONS = TIMEZONES.map((tz) => ({
    value: tz.value,
    label: tz.label,
    hint: tz.offset,
    keywords: `${tz.value} ${tz.offset}`,
}));
