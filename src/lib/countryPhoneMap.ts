/**
 * Mapping of country codes (without +) to phone number digits
 * This provides a centralized place to manage phone validation rules
 */
export const COUNTRY_PHONE_DIGITS_MAP: Record<string, number> = {
  // Middle East
  '971': 9,  // UAE
  '966': 9,  // Saudi Arabia
  '974': 8,  // Qatar
  '965': 8,  // Kuwait
  '968': 8,  // Oman
  '973': 8,  // Bahrain
  '962': 9,  // Jordan
  '961': 8,  // Lebanon
  
  // South Asia
  '91': 10,  // India
  '92': 10,  // Pakistan
  '94': 9,   // Sri Lanka
  '880': 10, // Bangladesh
  '977': 10, // Nepal
  
  // Southeast Asia
  '60': 9,   // Malaysia
  '65': 8,   // Singapore
  '66': 9,   // Thailand
  '62': 10,  // Indonesia
  '63': 10,  // Philippines
  
  // East Asia
  '86': 11,  // China
  '81': 10,  // Japan
  '82': 10,  // South Korea
  
  // North America
  '1': 10,   // USA/Canada
  
  // Europe
  '44': 10,  // UK
  '33': 9,   // France
  '49': 10,  // Germany
  '39': 10,  // Italy
  '34': 9,   // Spain
  
  // Oceania
  '61': 9,   // Australia
  '64': 9,   // New Zealand
  
  // Africa
  '27': 9,   // South Africa
  '20': 10,  // Egypt
  '234': 10, // Nigeria
  '254': 9,  // Kenya
};

/**
 * Get the number of phone digits for a given country code
 * @param countryCode - The country code without + (e.g., '91', '971')
 * @returns The number of digits, defaults to 10 if country code not found
 */
export const getPhoneDigitsForCountry = (countryCode: string): number => {
  return COUNTRY_PHONE_DIGITS_MAP[countryCode] || 10;
};

/**
 * Turn a stored phone number into the digits WhatsApp expects (E.164, no "+").
 *
 * Customer numbers are stored WITHOUT a country code (a UAE customer is
 * "507891884", an Indian one "9876543210"), so the sender has to supply it. The
 * old logic hardcoded India — it prefixed "91" to any 10-digit number and to
 * anything starting with 0 — which meant a 9-digit UAE number came out
 * unchanged and was then dropped by a length check, so UAE customers silently
 * received nothing. A number that DID reach 10 digits got "91" bolted on and
 * would have gone to an unrelated Indian number.
 *
 * `countryCode` is the partner's (e.g. "+971" or "971"). Defaults to 91 only so
 * legacy callers with no country context behave exactly as before.
 */
export const toWhatsAppNumber = (
  raw: string | null | undefined,
  countryCode?: string | null,
): string => {
  let p = String(raw ?? "").replace(/\D/g, "");
  if (!p) return "";
  const cc = String(countryCode ?? "").replace(/\D/g, "") || "91";
  const localLen = COUNTRY_PHONE_DIGITS_MAP[cc];

  // 00971… — international access prefix.
  if (p.startsWith("00")) p = p.slice(2);
  // Already full E.164 for this country: leave it alone.
  if (localLen && p.startsWith(cc) && p.length === cc.length + localLen) return p;
  // National trunk prefix: 0501234567 → 501234567.
  if (p.startsWith("0")) p = p.replace(/^0+/, "");
  // A plain local number → prefix the partner's country code.
  if (localLen && p.length === localLen) return cc + p;
  // Longer than a local number: it already carries some country code (e.g. an
  // Indian customer ordering from a UAE store). Trust it rather than double-prefix.
  if (localLen && p.length > localLen) return p;
  return cc + p;
};
