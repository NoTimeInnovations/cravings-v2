import { getPhoneDigitsForCountry } from './countryPhoneMap';

/**
 * Get user's country information using ipapi.co
 * Returns country code and phone number requirements
 */
export interface UserCountryInfo {
  country: string;
  countryCode: string;
  phoneDigits: number;
  callingCode: string;
}

const COUNTRY_PHONE_DIGITS: Record<string, { digits: number; callingCode: string }> = {
  IN: { digits: 10, callingCode: '+91' },    // India
  US: { digits: 10, callingCode: '+1' },     // United States
  GB: { digits: 10, callingCode: '+44' },    // United Kingdom
  CA: { digits: 10, callingCode: '+1' },     // Canada
  AU: { digits: 9, callingCode: '+61' },     // Australia
  AE: { digits: 9, callingCode: '+971' },    // UAE
  SA: { digits: 9, callingCode: '+966' },    // Saudi Arabia
  QA: { digits: 8, callingCode: '+974' },    // Qatar
  KW: { digits: 8, callingCode: '+965' },    // Kuwait
  OM: { digits: 8, callingCode: '+968' },    // Oman
  BH: { digits: 8, callingCode: '+973' },    // Bahrain
  // Add more countries as needed
};

let cachedCountryInfo: UserCountryInfo | null = null;

export async function getUserCountry(): Promise<UserCountryInfo> {
  // Return cached result if available
  if (cachedCountryInfo) {
    return cachedCountryInfo;
  }

  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      throw new Error('Failed to fetch country info');
    }

    const data = await response.json();
    const countryCode = data.country_code || 'IN'; // Default to India
    const phoneInfo = COUNTRY_PHONE_DIGITS[countryCode] || COUNTRY_PHONE_DIGITS['IN'];

    cachedCountryInfo = {
      country: data.country_name || 'India',
      countryCode: countryCode,
      phoneDigits: phoneInfo.digits,
      callingCode: phoneInfo.callingCode,
    };

    // Store in localStorage for faster access
    if (typeof window !== 'undefined') {
      localStorage.setItem('user-country-info', JSON.stringify(cachedCountryInfo));
    }

    return cachedCountryInfo;
  } catch (error) {
    console.error('Error fetching country info:', error);
    
    // Try to get from localStorage as fallback
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user-country-info');
      if (stored) {
        try {
          const parsedInfo = JSON.parse(stored) as UserCountryInfo;
          cachedCountryInfo = parsedInfo;
          return parsedInfo;
        } catch (e) {
          // Invalid stored data, continue to default
        }
      }
    }

    // Default to India if everything fails
    const defaultInfo: UserCountryInfo = {
      country: 'India',
      countryCode: 'IN',
      phoneDigits: 10,
      callingCode: '+91',
    };
    cachedCountryInfo = defaultInfo;
    return defaultInfo;
  }
}

/**
 * Validate phone number based on country
 * @param phoneNumber - The phone number to validate
 * @param countryCode - The country calling code without + (e.g., '91', '971')
 */
export function validatePhoneNumber(phoneNumber: string, countryCode: string): boolean {
  const requiredDigits = getPhoneDigitsForCountry(countryCode);
  const cleanedPhone = phoneNumber.replace(/\D/g, '');
  return cleanedPhone.length === requiredDigits;
}

/**
 * Get error message for invalid phone number
 * @param countryCode - The country calling code without + (e.g., '91', '971')
 */
export function getPhoneValidationError(countryCode: string): string {
  const requiredDigits = getPhoneDigitsForCountry(countryCode);
  return `Please enter a valid ${requiredDigits}-digit phone number`;
}

/**
 * Reset cached country info (useful for testing or when user changes location)
 */
export function resetCountryCache(): void {
  cachedCountryInfo = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user-country-info');
  }
}
