"use client";

// Tax-invoice bill layouts for the /bill print page, ported 1:1 from the desktop
// print app (cravings-software: billInvoice.js / billInvoiceUae.js) so the browser
// renders exactly what the desktop used to build & rasterize. Which layout shows is
// driven by partners.delivery_rules.bill_layout (see src/lib/printLayout.ts):
//   - "invoice" → InvoiceLayout    (bilingual ZATCA "Simplified Tax Invoice")
//   - "uae"     → UaeInvoiceLayout  (UAE FTA simplified tax invoice)
// Both render inside the page's #printable-content container; the page owns the
// container box/font (width, padding, font-family) so the desktop's zoom/capture
// geometry is unchanged.

import React from "react";

// Subset of the logged "Bill Contents JSON" payload these layouts consume. The
// /bill page builds this from the order and passes it in, so the on-screen render
// and the desktop render use identical data.
export interface BillLayoutData {
  store_name?: string | null;
  address?: string | null;
  phone?: string | null;
  gst_no?: string | null;
  trn?: string | null;
  type?: string | null; // display string e.g. "Takeaway", " Table 1"
  payment_method?: string | null;
  customer_name?: string | null;
  created_at?: string; // formatted date (en-GB)
  time?: string; // formatted time
  display_id?: string | number | null;
  id?: string;
  order_items: Array<{ name?: string; price?: number; quantity?: number }>;
  extra_charges?: Array<{ name?: string; price?: number }>;
  calculations?: {
    gst_percentage?: number;
    gst_amount?: number;
    grand_total?: number;
    discount_amount?: number;
    subtotal?: number;
  };
}

const money = (n: unknown) => (Number(n) || 0).toFixed(2);

// Bill-detail QR (customer scans to open the order online). Shared by both
// invoice layouts; renders nothing when the toggle is off (src null).
function DetailQr({ src, size = 96 }: { src?: string | null; size?: number }) {
  if (!src) return null;
  return (
    <div className="c" style={{ marginTop: 6 }}>
      <div style={{ fontSize: 10, marginBottom: 2 }}>Scan for bill details</div>
      {/* margin auto centers it: the img is display:block (Tailwind preflight),
          so text-align on the parent can't center it. */}
      <img
        src={src}
        alt="Bill detail QR code"
        style={{ width: size, height: size, display: "block", margin: "0 auto" }}
      />
    </div>
  );
}
const NBSP2 = "  ";

// ───────────────────────── ZATCA "invoice" layout ─────────────────────────

// order.type is an English display string ("Delivery", " Table 1", ...).
function invoiceTypeLabel(t: unknown, fullArabic: boolean): string {
  const s = String(t || "").trim();
  const pick = (ar: string, en: string) => (fullArabic ? `${ar} - ${en}` : en);
  if (/delivery/i.test(s)) return pick("توصيل", "Delivery");
  if (/takeaway/i.test(s)) return pick("سفري", "Takeaway");
  if (/parcel/i.test(s)) return fullArabic ? "سفري - " + s : s;
  if (/table/i.test(s)) return fullArabic ? "طاولة - " + s : s;
  return s;
}

export function InvoiceLayout({
  data,
  fullArabic = false,
  detailQr = null,
  qrSize = 96,
}: {
  data: BillLayoutData;
  fullArabic?: boolean;
  detailQr?: string | null;
  qrSize?: number;
}) {
  const c = data.calculations || {};
  const vatPct = c.gst_percentage != null ? c.gst_percentage : 15;
  const vat = Number(c.gst_amount) || 0;
  const grand = Number(c.grand_total) || 0;
  const productValue = Math.max(0, grand - vat);
  const discount = Number(c.discount_amount) || 0;
  const invoiceNo = Number(data.display_id) > 0 ? String(data.display_id) : String(data.id || "").slice(0, 8);
  const orderNo = Number(data.display_id) > 0 ? String(data.display_id) : String(data.id || "").slice(0, 4);
  const dateTime = `${data.created_at || ""} ${data.time || ""}`.trim();
  const typeText = invoiceTypeLabel(data.type, fullArabic);
  const payMethod = String(data.payment_method || "cash").toUpperCase();
  const customer = data.customer_name || "CASH CUSTOMER";

  const Kv = ({ en, ar, val, bold }: { en: string; ar: string; val: string; bold?: boolean }) => (
    <div className="kv">
      <span className="l">{fullArabic ? (<><span className="en">{en}</span> {ar}</>) : en}</span>
      <span className={"n" + (bold ? " b" : "")}>{val}</span>
    </div>
  );
  const Th = ({ en, ar, cls }: { en: string; ar: string; cls?: string }) => (
    <th className={cls}>{fullArabic ? (<>{ar}<br />{en}</>) : en}</th>
  );

  return (
    <>
      <style>{invoiceCss}</style>
      <div className="c store">{data.store_name || ""}</div>
      {data.address ? <div className="c sub">{data.address}</div> : null}
      {data.gst_no ? (
        <div className="c sub">
          {fullArabic ? "رقم الضريبي" : "Tax No"} : <span className="mono">{data.gst_no}</span>
        </div>
      ) : null}
      {data.trn ? (
        <div className="c sub">
          TRN : <span className="mono">{data.trn}</span>
        </div>
      ) : null}
      {data.phone ? (
        <div className="c sub">
          {fullArabic ? "رقم الجوال" : "Mobile"} : <span className="mono">{data.phone}</span>
        </div>
      ) : null}
      {fullArabic ? (
        <>
          <div className="c b" style={{ marginTop: 5 }}>فاتورة ضريبية مبسطة</div>
          <div className="c b">Simplified Tax Invoice</div>
        </>
      ) : (
        <div className="c b" style={{ marginTop: 5 }}>Simplified Tax Invoice</div>
      )}
      <div className="orderbox">
        {fullArabic ? "طلب" : "Order"} #{NBSP2}
        <span className="mono">{orderNo}</span>
      </div>
      <div className="head2">
        <span>
          {fullArabic ? "ر الفاتورة" : "Invoice #"}
          <br />
          <span className="mono">{String(invoiceNo)}</span>
        </span>
        <span className="r">
          {typeText}
          <br />
          <span className="mono">{dateTime}</span>
        </span>
      </div>
      <table className="items">
        <tbody>
          <tr>
            <Th en="Total" ar="الإجمالي" cls="ctot" />
            <Th en="Price" ar="سعر" cls="cprice" />
            <Th en="Qty" ar="الكمية" cls="cqty" />
            <Th en="Description" ar="الوصف" />
          </tr>
          {(data.order_items || []).map((it, i) => {
            const qty = Number(it.quantity) || 0;
            const price = Number(it.price) || 0;
            return (
              <tr key={i}>
                <td className="n">{money(qty * price)}</td>
                <td className="n">{money(price)}</td>
                <td className="n">
                  {qty}
                  <div className="each">EACH</div>
                </td>
                <td className="desc">{it.name}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Kv en="Disc (%)" ar="خصم" val={money(discount)} />
      <Kv en="Product Value Excl.VAT" ar="قيمة المنتجات" val={money(productValue)} />
      <Kv en={`VAT(${vatPct}%)`} ar="ضريبة القيمة المضافة" val={money(vat)} />
      <Kv en="Net Total" ar="صافي" val={money(grand)} bold />
      <div className="pay">
        <Kv en={payMethod} ar="المبلغ المدفوع" val={money(grand)} />
      </div>
      <div className="cust">{customer}</div>
      <div className="thanks">*** THANK YOU ***</div>
      <DetailQr src={detailQr} size={qrSize} />
    </>
  );
}

const invoiceCss = `
#printable-content .c{text-align:center;} #printable-content .b{font-weight:bold;}
#printable-content .store{font-size:17px;font-weight:bold;}
#printable-content .sub{font-size:11px;}
#printable-content .mono{font-family:monospace;}
#printable-content .orderbox{ border:2px solid #000; padding:4px 6px; text-align:center; font-weight:bold;
  font-size:15px; margin:7px auto; width:75%; box-sizing:border-box; }
#printable-content .head2{ display:flex; justify-content:space-between; gap:8px; border-bottom:1px solid #000;
  padding:4px 0; margin-bottom:4px; font-size:11px; }
#printable-content .head2 .r{ text-align:right; }
#printable-content table.items{ width:100%; border-collapse:collapse; margin:2px 0; table-layout:fixed; }
#printable-content table.items th, #printable-content table.items td{ border:1px solid #000; padding:3px 3px; font-size:11px;
  vertical-align:top; word-break:break-word; }
#printable-content table.items th{ text-align:center; font-weight:bold; }
#printable-content .ctot,#printable-content .cprice{ width:20%; } #printable-content .cqty{ width:16%; }
#printable-content td.n{ text-align:center; font-family:monospace; }
#printable-content td.desc{ text-align:right; }
#printable-content .each{ font-size:9px; }
#printable-content .kv{ display:flex; justify-content:space-between; align-items:center; gap:8px;
  border-bottom:1px solid #000; padding:4px 2px; }
#printable-content .kv .l{ flex:1; min-width:0; font-weight:bold; }
#printable-content .kv .en{ font-size:10px; font-weight:normal; }
#printable-content .kv .n{ flex-shrink:0; font-family:monospace; text-align:right; min-width:56px; }
#printable-content .pay{ border:1px solid #000; margin-top:6px; }
#printable-content .pay .kv{ border-bottom:1px solid #000; } #printable-content .pay .kv:last-child{ border-bottom:none; }
#printable-content .cust{ text-align:center; margin-top:6px; letter-spacing:1px; }
#printable-content .thanks{ text-align:center; font-weight:bold; margin-top:5px; }
`;

// ───────────────────────── UAE simplified-invoice layout ─────────────────────────

function uaeTypeLabel(t: unknown, fullArabic: boolean): string {
  const s = String(t || "").trim();
  const pick = (ar: string, en: string) => (fullArabic ? `${ar} - ${en}` : en);
  if (/delivery/i.test(s)) return pick("توصيل", "Delivery");
  if (/takeaway/i.test(s)) return pick("سفري", "Take Away");
  if (/parcel/i.test(s)) return fullArabic ? "سفري - " + s : s;
  if (/table/i.test(s)) return fullArabic ? "طاولة - " + s : s;
  return s;
}

export function UaeInvoiceLayout({
  data,
  fullArabic = false,
  detailQr = null,
  qrSize = 96,
}: {
  data: BillLayoutData;
  fullArabic?: boolean;
  detailQr?: string | null;
  qrSize?: number;
}) {
  const c = data.calculations || {};
  const vatPct = c.gst_percentage != null ? c.gst_percentage : 5;
  const vat = Number(c.gst_amount) || 0;
  const grand = Number(c.grand_total) || 0;
  // Item prices are VAT-inclusive, so the pre-VAT amount is grand - vat.
  const beforeVat = Math.max(0, grand - vat);
  const discount = Number(c.discount_amount) || 0;
  const invoiceNo = Number(data.display_id) > 0 ? String(data.display_id) : String(data.id || "").slice(0, 8);
  const dateTime = `${data.created_at || ""} ${data.time || ""}`.trim();
  const typeText = uaeTypeLabel(data.type, fullArabic);

  // VAT and Net Amount labels are ALWAYS bilingual, like the reference invoice.
  const vatLabel = `الضريبة / VAT @ ${vatPct}%`;
  const netLabel = `اجمالى / Net Amount`;

  const charges = (data.extra_charges || []).filter((ch) => Number(ch.price) !== 0);

  return (
    <>
      <style>{uaeCss}</style>
      <div className="c store">{data.store_name || ""}</div>
      {data.address ? <div className="c sub">{data.address}</div> : null}
      {data.phone ? (
        <div className="c sub">
          Tel: <span className="mono">{data.phone}</span>
        </div>
      ) : null}
      {data.trn ? (
        <div className="c sub">
          TRN : <span className="mono">{data.trn}</span>
        </div>
      ) : data.gst_no ? (
        <div className="c sub">
          Tax No : <span className="mono">{data.gst_no}</span>
        </div>
      ) : null}
      <div className="c title">{fullArabic ? "فاتورة ضريبية / Tax Invoice" : "Tax Invoice"}</div>
      {typeText ? <div className="c otype">{typeText}</div> : null}
      <div className="info">
        <div>
          Bill No: <span className="mono">{invoiceNo}</span>
        </div>
        {dateTime ? (
          <div>
            Date: <span className="mono">{dateTime}</span>
          </div>
        ) : null}
      </div>
      <table className="items">
        <tbody>
          <tr>
            <th className="cdesc">Item&apos;s</th>
            <th className="cn cprice">Price</th>
            <th className="cn ctot">Total</th>
          </tr>
          {(data.order_items || []).map((it, i) => {
            const qty = Number(it.quantity) || 0;
            const price = Number(it.price) || 0;
            return (
              <tr key={i}>
                <td className="desc">
                  {qty}-{it.name}
                </td>
                <td className="n">{money(price)}</td>
                <td className="n">{money(qty * price)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="sep2" />
      {charges.map((ch, i) => (
        <div className="kv" key={i}>
          <span className="l">{ch.name}</span>
          <span className="n">{money(ch.price)}</span>
        </div>
      ))}
      {discount > 0 ? (
        <div className="kv">
          <span className="l">Discount</span>
          <span className="n">-{money(discount)}</span>
        </div>
      ) : null}
      <div className="kv">
        <span className="l">Total Before VAT</span>
        <span className="n">{money(beforeVat)}</span>
      </div>
      <div className="kv">
        <span className="l">{vatLabel}</span>
        <span className="n">{money(vat)}</span>
      </div>
      <div className="sep" />
      <div className="kv big">
        <span className="l">{netLabel}</span>
        <span className="n">{money(grand)}</span>
      </div>
      <div className="thanks">*** THANK YOU ***</div>
      <DetailQr src={detailQr} size={qrSize} />
    </>
  );
}

const uaeCss = `
#printable-content .c{text-align:center;} #printable-content .b{font-weight:bold;}
#printable-content .store{font-size:18px;font-weight:bold;line-height:1.15;text-transform:uppercase;}
#printable-content .sub{font-size:11px;}
#printable-content .mono{font-family:monospace;}
#printable-content .title{font-size:14px;font-weight:bold;margin-top:5px;}
#printable-content .otype{font-size:13px;font-weight:bold;}
#printable-content .info{font-size:11px;margin-top:4px;}
#printable-content .info div{padding:1px 0;}
#printable-content .sep{border-top:1px dashed #000;margin:5px 0;}
#printable-content .sep2{border-top:3px double #000;margin:5px 0;}
#printable-content table.items{ width:100%; border-collapse:collapse; table-layout:fixed; }
#printable-content table.items th,#printable-content table.items td{ padding:2px 2px; font-size:11px; vertical-align:top; word-break:break-word; }
#printable-content table.items th{ font-weight:bold; border-top:1px dashed #000; border-bottom:1px dashed #000; }
#printable-content th.cdesc,#printable-content td.desc{ text-align:left; }
#printable-content th.cn,#printable-content td.n{ text-align:right; font-family:monospace; }
#printable-content .cprice{ width:22%; } #printable-content .ctot{ width:22%; }
#printable-content .kv{ display:flex; justify-content:space-between; align-items:center; gap:8px; padding:2px 2px; font-size:12px; }
#printable-content .kv .l{ flex:1; min-width:0; }
#printable-content .kv .n{ flex-shrink:0; font-family:monospace; text-align:right; min-width:56px; }
#printable-content .kv.big{ font-weight:bold; font-size:14px; }
#printable-content .thanks{ text-align:center; font-weight:bold; margin-top:6px; }
`;
