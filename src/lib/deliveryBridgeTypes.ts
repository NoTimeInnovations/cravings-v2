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
    /** "active" | "token_expired" | "pending_otp" | "blocked" | "disabled" | "none" | "unknown" */
    status: string;
    connected: boolean;
    /** How many ACTIVE accounts are tagged into this provider's configured group
     *  on the bridge — what dispatch actually pools from. 0 when no group is set
     *  or none are tagged. */
    groupAccounts: number;
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

export interface PorterWalletTxn {
    /** Group header from Porter, e.g. "Jul 25, 2026". */
    date: string;
    title: string;
    /** Amount as a string, e.g. "500". */
    amount: string;
    /** "credit" (recharge) | "debit" (trip deduction). */
    type: string;
    /** Which pool account this txn belongs to (shown for pooled partners). */
    account?: string;
}

/** One Porter account in a partner's dispatch pool. */
export interface PorterWalletAccount {
    accountId: string;
    label: string;
    balance: number;
}

export interface PorterWalletLive {
    /** The partner's total Porter balance = sum across their pool (1 account
     *  for a solo-connected partner, N for a pooled/group partner). */
    balance: number;
    rechargeLink: string | null;
    /** Real transactions from Porter's wallet API (recharges + trip
     *  deductions), merged across the pool, newest first. Replaces the manual
     *  recharge log for Porter. */
    history: PorterWalletTxn[];
    /** Per-account balance breakdown; length 1 = solo, >1 = pooled. */
    accounts: PorterWalletAccount[];
    /** True when the partner dispatches Porter through a >1-account group. */
    pooled: boolean;
}

export interface ThirdPartyChargeData {
    ok: true;
    currency: string;
    needsMigration: boolean;
    recharges: import("@/store/orderStore").DeliveryRecharge[];
    summaries: Record<ChargeProvider, ProviderSummary>;
    orders: OrderCharge[];
    porterWallet: PorterWalletLive | null;
    /** Partner-set balance below which they get a WhatsApp low-balance alert
     *  for their Porter pool. 0 = disabled (no partner alert). Stored on
     *  delivery_rules.low_balance_threshold. */
    lowBalanceThreshold: number;
}
