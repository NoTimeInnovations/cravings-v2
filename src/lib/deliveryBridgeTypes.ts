/**
 * Shared types for the delivery-bridge connect + charge-tracking feature.
 *
 * Kept in a plain (non-"use server") module so the server actions in
 * src/app/actions/deliveryConnect.ts + deliveryCharges.ts export ONLY async
 * functions, while client components and the actions themselves import these
 * types from here.
 */

/** Providers with an in-dashboard OTP connect flow. */
export type ConnectProvider = "porter" | "rapido";

/** All bridge providers that can accrue recharges / delivery charges. */
export type ChargeProvider = "porter" | "rapido" | "uber";

// ── connect ────────────────────────────────────────────────────────────────

export interface VerifyOtpSuccess {
    ok: true;
    provider: ConnectProvider;
    mobile: string;
    group: string;
    accountId: string;
    /** Column written on the partner row (porter_mobile | rapido_mobile). */
    mobileColumn: string;
    /** Updated delivery_rules JSON, so the caller can setState() locally. */
    deliveryRules: Record<string, unknown>;
}

export interface ProviderConnection {
    mobile: string | null;
    group: string | null;
    /** "active" | "token_expired" | "pending_otp" | "blocked" | "disabled" | "none" */
    status: string;
    connected: boolean;
}

// ── charges ──────────────────────────────────────────────────────────────────

export interface OrderCharge {
    orderId: string;
    displayId: number | null;
    createdAt: string;
    provider: string;
    state: string | null;
    /** Fare the provider charged the restaurant, from meta.fareAmount. */
    fare: number | null;
    paymentMode: string | null;
}

export interface ProviderSummary {
    provider: ChargeProvider;
    connectedMobile: string | null;
    totalRecharged: number;
    /** Every delivery fare for this provider (cash + wallet) — total spend. */
    totalSpent: number;
    /** Fares paid from the prepaid wallet — the part that draws the balance down. */
    walletSpent: number;
    /** totalRecharged − walletSpent (cash deliveries don't touch the wallet). */
    balance: number;
    orderCount: number;
}

export interface PorterWalletLive {
    balance: number;
    rechargeLink: string | null;
}

export interface ThirdPartyChargeData {
    ok: true;
    currency: string;
    needsMigration: boolean;
    recharges: import("@/store/orderStore").DeliveryRecharge[];
    summaries: Record<ChargeProvider, ProviderSummary>;
    orders: OrderCharge[];
    porterWallet: PorterWalletLive | null;
}
