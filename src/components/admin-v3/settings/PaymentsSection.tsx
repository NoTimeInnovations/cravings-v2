"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";

import { setOwnRazorpayEnabled } from "@/app/actions/razorpayPartner";

import { AdminV3Button } from "../ui/primitives";
import {
  FieldRow,
  Note,
  NumberField,
  SegmentedField,
  SettingsCard,
  TextField,
  Toggle,
  ToggleRow,
  num,
  useSectionDraft,
} from "./controls";
import { GatewayPage } from "./GatewayPage";

/* ------------------------------------------------------------------ draft */

interface PaymentsDraft {
  accept_cod: boolean;
  show_payment_qr: boolean;
  accept_payments_via_cashfree: boolean;
  upi_id: string;
  post_payment_message: string;
  cashfree_merchant_id: string;
  delivery_qr_method: "none" | "upi" | "cashfree";

  gst_enabled: boolean;
  gst_no: string;
  gst_percentage: number;
  use_vat: boolean;
  trn: string;

}

const DEFAULT_POST_PAYMENT_MESSAGE =
  "Send payment screenshot to WhatsApp after payment";

function read(partner: any): PaymentsDraft {
  const rules = (partner?.delivery_rules || {}) as any;
  const dqm = partner?.delivery_qr_method;
  return {
    accept_cod: partner?.accept_cod ?? true,
    show_payment_qr: !!partner?.show_payment_qr,
    accept_payments_via_cashfree: !!partner?.accept_payments_via_cashfree,
    upi_id: partner?.upi_id || "",
    post_payment_message: partner?.post_payment_message || DEFAULT_POST_PAYMENT_MESSAGE,
    cashfree_merchant_id: partner?.cashfree_merchant_id || "",
    delivery_qr_method: dqm === "upi" || dqm === "cashfree" ? dqm : "none",

    gst_enabled: num(partner?.gst_percentage, 0) > 0,
    gst_no: partner?.gst_no || "",
    gst_percentage: num(partner?.gst_percentage, 0),
    use_vat: !!rules.use_vat,
    trn: rules.trn || "",

  };
}

function build(d: PaymentsDraft, partner: any): Record<string, unknown> {
  const existing = (partner?.delivery_rules || {}) as any;
  return {
    accept_cod: d.accept_cod,
    show_payment_qr: d.show_payment_qr,
    accept_payments_via_cashfree: d.accept_payments_via_cashfree,
    upi_id: d.upi_id,
    post_payment_message: d.post_payment_message.trim() || null,
    cashfree_merchant_id: d.cashfree_merchant_id.trim() || null,
    delivery_qr_method: d.delivery_qr_method,
    gst_no: d.gst_no,
    // A rate of 0 IS how tax-off is stored — the toggle has no column of its own.
    gst_percentage: d.gst_enabled ? d.gst_percentage : 0,
    delivery_rules: {
      ...existing,
      use_vat: d.use_vat,
      trn: d.trn.trim() || null,
    },
  };
}

/* ------------------------------------------------------------------- tabs */

export type PaymentsTab = "methods" | "tax";

export const PAYMENTS_TABS: { value: PaymentsTab; label: string }[] = [
  { value: "methods", label: "Methods" },
  { value: "tax", label: "Tax" },
];

/* ----------------------------------------------------------------- screen */

export function PaymentsSection({ tab }: { tab: PaymentsTab }) {
  const { partner, draft, patch, save } = useSectionDraft(
    read,
    build,
    "Payment settings saved",
  );
  const [gatewayOpen, setGatewayOpen] = React.useState(false);
  const [disabling, setDisabling] = React.useState(false);

  // Leaving Methods drops the gateway page, or coming back later reopens it
  // instead of the methods list.
  React.useEffect(() => {
    if (tab !== "methods" && gatewayOpen) setGatewayOpen(false);
  }, [tab, gatewayOpen]);

  /**
   * Turning online payment OFF must also stand down own-Razorpay.
   *
   * Checkout treats own_razorpay_enabled as sufficient on its own — see
   * PlaceOrderModalV2's `baseCashfree = (cashfree…) || isFlamin` — so clearing
   * only accept_payments_via_cashfree would leave the online option live for a
   * Razorpay partner who just switched it off.
   */
  const disableOnline = async () => {
    if (disabling) return;
    setDisabling(true);
    try {
      if (partner?.id) {
        const r = await setOwnRazorpayEnabled(partner.id, false);
        if (!r.ok) console.warn("[v3 payments] disable razorpay:", r.error);
      }
      await save({ accept_payments_via_cashfree: false });
    } finally {
      setDisabling(false);
    }
  };

  if (tab === "methods" && gatewayOpen) {
    return (
      <GatewayPage
        partnerId={partner?.id}
        cashfreeMerchantId={draft.cashfree_merchant_id}
        onCashfreeMerchantIdChange={(v) => patch({ cashfree_merchant_id: v })}
        onBack={() => setGatewayOpen(false)}
        onEnable={(merchantId) =>
          save({
            cashfree_merchant_id: merchantId,
            accept_payments_via_cashfree: true,
          })
        }
      />
    );
  }
  const taxLabel = draft.use_vat ? "VAT" : "GST";

  /**
   * GST is India's tax; everywhere else it is VAT — so an Indian store has no
   * reason to be offered the switch.
   *
   * A blank country counts as India: it is the default market, and legacy rows
   * predate the field. The `use_vat` escape hatch keeps the switch reachable for
   * a store already using VAT with no country saved, which would otherwise be
   * stuck on a label it cannot turn off.
   */
  const country = (partner?.country || "").trim().toLowerCase();
  const showVatSwitch = (!!country && country !== "india") || draft.use_vat;

  if (tab === "methods") {
    return (
      <SettingsCard>
        <ToggleRow
          title="Cash"
          desc="Pay on delivery, at the counter, or at the table."
          checked={draft.accept_cod}
          onChange={(v) => patch({ accept_cod: v })}
          divider
        />
        {/* Turning it ON opens the gateway page instead of flipping the flag:
            the page's own save is what turns it on, so a partner who backs out
            halfway is never left advertising a gateway with no credentials. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-100 py-[11px] dark:border-zinc-800">
          <div className="min-w-0 flex-[1_1_240px]">
            <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              Online payment
            </div>
            <div className="mt-1 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
              Cards, UPI and netbanking through your gateway.
            </div>
          </div>
          {draft.accept_payments_via_cashfree ? (
            <AdminV3Button
              variant="secondary"
              className="h-[30px] px-2.5 text-[12.5px]"
              onClick={() => setGatewayOpen(true)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Configure
            </AdminV3Button>
          ) : null}
          <Toggle
            label="Online payment"
            checked={draft.accept_payments_via_cashfree}
            disabled={disabling}
            onChange={(v) => {
              if (v) setGatewayOpen(true);
              else void disableOnline();
            }}
          />
        </div>
        {/* Last, with its dependent fields directly under it. The UPI ID is ALSO
            what Rider QR renders when it is set to "My UPI ID" — and that tab
            tells the partner to "add a UPI ID under Methods first" — so it stays
            reachable in that case even with this toggle off. Gating it on this
            switch alone would make that instruction impossible to follow. */}
        <ToggleRow
          title="UPI QR after ordering"
          desc="Shows your UPI QR screen once the order is placed."
          checked={draft.show_payment_qr}
          onChange={(v) => patch({ show_payment_qr: v })}
        />
        {draft.show_payment_qr || draft.delivery_qr_method === "upi" ? (
          <FieldRow>
            <TextField
              label="UPI ID"
              hint={
                draft.show_payment_qr
                  ? "the QR is generated from this"
                  : "used by the rider’s QR"
              }
              value={draft.upi_id}
              onChange={(v) => patch({ upi_id: v })}
              placeholder="yourname@bank"
              translateNo
            />
          </FieldRow>
        ) : null}
        {draft.show_payment_qr ? (
          <FieldRow>
            <TextField
              label="Message under the QR"
              value={draft.post_payment_message}
              onChange={(v) => patch({ post_payment_message: v })}
              placeholder={DEFAULT_POST_PAYMENT_MESSAGE}
              basis="100%"
            />
          </FieldRow>
        ) : null}
      </SettingsCard>
    );
  }

  if (tab === "tax") {
    return (
      <SettingsCard>
        <ToggleRow
          title="Charge tax on orders"
          desc="Adds the tax line at checkout and on bills."
          checked={draft.gst_enabled}
          onChange={(v) => patch({ gst_enabled: v })}
          divider
        />
        <FieldRow>
          <TextField
            label="Tax number"
            hint={draft.use_vat ? "TRN" : "GSTIN"}
            value={draft.use_vat ? draft.trn : draft.gst_no}
            onChange={(v) => (draft.use_vat ? patch({ trn: v }) : patch({ gst_no: v }))}
            translateNo
          />
          <NumberField
            label="Rate"
            hint="%"
            value={draft.gst_percentage}
            onChange={(v) => patch({ gst_percentage: v })}
            max={100}
          />
        </FieldRow>
        {showVatSwitch ? (
          <ToggleRow
            title="Call it VAT instead of GST"
            desc="Most stores outside India show VAT."
            checked={draft.use_vat}
            onChange={(v) => patch({ use_vat: v })}
            divider
          />
        ) : null}

        {draft.gst_enabled && draft.gst_percentage === 0 ? (
          <Note>
            A rate of 0% is how tax-off is stored, so this switch turns itself back
            off when you save. Set a rate to keep it on.
          </Note>
        ) : (
          <Note>
            Bills and checkout label this as {taxLabel}. India-style bills split it
            into CGST and SGST automatically.
          </Note>
        )}
      </SettingsCard>
    );
  }

  return null;
}
