/**
 * Hotel IDs that require prices to be displayed with 3 decimal places
 */
export const HOTELS_WITH_THREE_DECIMAL_PRICES = [
  "1c4f8693-c869-476d-9d25-426cbf92f5ed",
  "ce8de656-149f-4ea5-ba46-14be55c58674",
  "094bd204-6496-4c8d-ac93-d77eb4f60e5b",
] as const;

/**
 * Helper function to check if a hotel requires 3 decimal places for prices
 * @param hotelId - The hotel ID to check
 * @returns boolean - true if the hotel requires 3 decimal places
 */
export const requiresThreeDecimalPlaces = (hotelId: string | undefined): boolean => {
  if (!hotelId) return false;
  return HOTELS_WITH_THREE_DECIMAL_PRICES.includes(hotelId as any);
};

/**
 * Helper function to format price based on hotel requirements
 * @param price - The price to format
 * @param hotelId - The hotel ID
 * @returns formatted price string or number
 */
export const formatPrice = (price: number, hotelId: string | undefined): string | number => {
  return requiresThreeDecimalPlaces(hotelId) ? price.toFixed(3) : price;
};
