export interface TimezoneEntry {
    /** IANA identifier, e.g. "Asia/Kolkata" — this is what gets stored. */
    value: string;
    /** Readable label (underscores → spaces), e.g. "Asia/Kolkata". */
    label: string;
    /** Current GMT offset, e.g. "GMT+5:30". Empty if the engine can't resolve it. */
    offset: string;
    /** Human timezone names, e.g. ["Gulf Standard Time"] — includes both DST
     *  variants where applicable ("Eastern Standard Time"/"Eastern Daylight Time").
     *  Empty when the engine only returns a GMT-offset name. */
    names: string[];
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

// Human name(s) for a zone, e.g. "Gulf Standard Time" / "India Standard Time".
// Sampled in Jan + Jul so both DST variants are captured (EST + EDT). GMT-offset
// style names (e.g. "GMT+04:00") are dropped — the offset is already searchable.
const WINTER = new Date(Date.UTC(2025, 0, 15));
const SUMMER = new Date(Date.UTC(2025, 6, 15));
function longNamesFor(timeZone: string): string[] {
    const out = new Set<string>();
    for (const d of [WINTER, SUMMER]) {
        try {
            const n = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "long" })
                .formatToParts(d)
                .find((p) => p.type === "timeZoneName")?.value;
            if (n && !/^GMT/i.test(n)) out.add(n);
        } catch {
            /* ignore */
        }
    }
    return [...out];
}

// Acronym of a timezone name, e.g. "Gulf Standard Time" -> "GST". Lets users find
// a zone by its abbreviation.
function acronym(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
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
        names: longNamesFor(tz),
    }));
}

export const TIMEZONES: TimezoneEntry[] = buildTimezones();

/**
 * SearchableSelect options for every timezone. Stored value is the IANA id
 * (what the visibility / scheduling helpers expect). Searchable by name and
 * offset (e.g. "kolkata", "GMT+5:30").
 */
export const TIMEZONE_OPTIONS = TIMEZONES.map((tz) => {
    const primaryName = tz.names[0] || "";
    const acronyms = tz.names.map(acronym).filter(Boolean);
    return {
        value: tz.value,
        label: tz.label,
        // e.g. "Gulf Standard Time · GMT+4" so the human name shows in the picker.
        hint: primaryName ? `${primaryName} · ${tz.offset}` : tz.offset,
        // Searchable by IANA id, offset, full name ("gulf standard time") and
        // abbreviation ("GST", "IST", "EST").
        keywords: `${tz.value} ${tz.offset} ${tz.names.join(" ")} ${acronyms.join(" ")}`,
    };
});
