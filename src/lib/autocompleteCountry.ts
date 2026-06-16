/**
 * Resolve the ISO country code to bias Google Places autocomplete toward,
 * based on a partner's `country_code` (dialing code) or `country` name.
 *
 * Returns `undefined` when the partner's country can't be determined, so
 * callers should omit `componentRestrictions` entirely (worldwide search)
 * rather than silently blocking results — e.g. a Qatar partner must not be
 * forced into India-only predictions.
 */
export function resolveAutocompleteCountry(
  hotelData: any,
): string | undefined {
  const dialToIso: Record<string, string> = {
    "+91": "in",
    "+974": "qa",
    "+971": "ae",
    "+966": "sa",
    "+973": "bh",
    "+965": "kw",
    "+968": "om",
  };
  const nameToIso: Record<string, string> = {
    india: "in",
    qatar: "qa",
    "united arab emirates": "ae",
    uae: "ae",
    "saudi arabia": "sa",
    bahrain: "bh",
    kuwait: "kw",
    oman: "om",
  };
  const code = hotelData?.country_code as string | undefined;
  const name = (hotelData?.country as string | undefined)?.trim().toLowerCase();
  return (code && dialToIso[code]) || (name && nameToIso[name]) || undefined;
}
