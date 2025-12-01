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
