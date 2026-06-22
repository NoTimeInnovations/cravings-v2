import { verifyCashfreePayment } from "@/app/actions/cashfree";

type VerifyRes = Awaited<ReturnType<typeof verifyCashfreePayment>>;

/**
 * Verify a Cashfree payment, treating ACTIVE as "not settled yet" rather than a
 * failure. Cashfree flips ACTIVE -> PAID asynchronously after the customer pays,
 * so a single check can race the flip and wrongly report a paid order as unpaid.
 * On an ACTIVE result we re-check a bounded number of times before giving up and
 * leaving final reconciliation to the Cashfree webhook + reconcile cron.
 *
 * The server action already polls internally (~14s); these extra rounds only
 * matter for genuinely-slow settles. Returns the last verify result.
 */
export async function verifyCashfreePaymentSettled(
  partnerId: string,
  cfOrderId: string,
  opts?: { retries?: number; delayMs?: number },
): Promise<VerifyRes> {
  const retries = opts?.retries ?? 2;
  const delayMs = opts?.delayMs ?? 3000;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  let res = await verifyCashfreePayment(partnerId, cfOrderId);
  for (let i = 0; i < retries; i++) {
    // Stop on a hard error, a settled PAID, or any terminal non-paid status
    // (EXPIRED / TERMINATED / ...). Only a non-terminal ACTIVE is worth retrying.
    if (!res.success || res.paid || res.orderStatus !== "ACTIVE") break;
    await sleep(delayMs);
    res = await verifyCashfreePayment(partnerId, cfOrderId);
  }
  return res;
}
