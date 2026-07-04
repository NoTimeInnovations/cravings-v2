import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Daily stock reset for stock-managed partners (Scheduled stock feature):
//   1. Re-enable items that were auto-disabled because they hit 0 stock, so they
//      come back for a fresh day. Must run BEFORE the reset, while qty is still
//      <= 0. Items the partner turned off while still in stock are left off.
//   2. Reset every stock-managed item's quantity back to the daily default 9999.
// Both are scoped to partners whose feature_flags enable stockmanagement, so
// partners not using the feature are never touched.
const REENABLE_DEPLETED = `
  mutation ReenableDepletedStockItems {
    update_menu(
      where: {
        is_available: { _eq: false },
        deletion_status: { _eq: 0 },
        stocks: { stock_quantity: { _lte: 0 }, stock_type: { _neq: "DATE" } },
        partner: { feature_flags: { _ilike: "%stockmanagement-true%" } },
        reactivate_at: { _is_null: true }
      },
      _set: { is_available: true }
    ) {
      affected_rows
    }
  }
`;

// Date-capped items (stock_type 'DATE') are excluded: their stock is tracked
// per date in menu_date_stocks and each future date is already independent, so
// there is nothing to reset each morning and their global counter is inert.
const RESET_STOCK = `
  mutation ResetStockToDefault {
    update_stocks(
      where: {
        stock_type: { _neq: "DATE" },
        menu: { partner: { feature_flags: { _ilike: "%stockmanagement-true%" } } }
      },
      _set: { stock_quantity: 9999 }
    ) {
      affected_rows
    }
  }
`;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    // Order matters: re-enable depleted items first (qty still <= 0), then reset.
    const reenable = await fetchFromHasura(REENABLE_DEPLETED, {});
    const reset = await fetchFromHasura(RESET_STOCK, {});
    return NextResponse.json({
      ok: true,
      reEnabled: reenable?.update_menu?.affected_rows ?? 0,
      reset: reset?.update_stocks?.affected_rows ?? 0,
    });
  } catch (e: any) {
    console.error("[reset-stock] failed:", e?.message || e);
    return NextResponse.json({ error: "reset_failed" }, { status: 500 });
  }
}
