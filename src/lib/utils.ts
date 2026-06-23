import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a money amount in any ISO-4217 currency for display. Falls back to a
 * plain "<CODE> <amount>" string if the currency code isn't recognised by Intl.
 * `maxFrac` lets tiny per-message costs show more precision (e.g. ₹0.88).
 */
export function formatMoney(
  amount: number,
  currency: string = "INR",
  maxFrac: number = 2,
) {
  const iso = (currency || "INR").toUpperCase();
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: iso,
      maximumFractionDigits: maxFrac,
    }).format(amount);
  } catch {
    return `${iso} ${amount.toFixed(maxFrac)}`;
  }
}
