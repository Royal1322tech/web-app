import { Link, useParams } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { SystemState } from "@/components/ui/system-state";
import { useLocale } from "@/features/localization/locale-provider";
import { hotels } from "@/features/hotels/data/hotels.fixture";
import { hotelDisplayAddress, hotelDisplayName } from "@/features/hotels/lib/presentation";
import { useDemo } from "./demo-provider";
import { Workspace } from "./shared";
import type { AccountingReviewStatus, InvoiceRecord, PaymentSettlementStatus } from "./types";
import { useState } from "react";

function formatMoney(minor: number, currency: string, locale: "en" | "ar") {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

function Lifecycle({ status }: { status: InvoiceRecord["lifecycle"] }) {
  const { t } = useLocale();
  return <span className={`status-badge status-badge--${status}`}>{status === "issued" ? t("Issued", "صادر") : t("Draft", "مسودة")}</span>;
}

function Settlement({ status }: { status: PaymentSettlementStatus }) {
  const { t } = useLocale();
  const label = {
    unpaid: t("Unpaid", "غير مدفوع"),
    partially_paid: t("Partially Paid", "مدفوع جزئيًا"),
    fully_settled: t("Fully Settled", "مسدد بالكامل"),
  }[status];
  return <span className="status-badge">{label}</span>;
}

export function InvoiceHistoryPage() {
  const { t } = useLocale();
  const { records } = useDemo();
  const [query, setQuery] = useState("");
  const invoices = records.filter((booking) => booking.invoice)
    .filter((booking) => `${booking.id} ${booking.agencyReference} ${booking.invoice?.reference}`.toLowerCase().includes(query.toLowerCase()));
  return <Workspace title={t("Invoice History", "سجل الفواتير")}>
    <p className="workspace-intro">{t("Invoices appear here when a booking record includes a supplied invoice document.", "تظهر الفواتير هنا عند توفر مستند فاتورة مرتبط بسجل الحجز.")}</p>
    <label className="invoice-search">{t("Search invoices", "البحث في الفواتير")}<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Invoice or booking reference", "مرجع الفاتورة أو الحجز")} /></label>
    {invoices.length ? <div className="invoice-list">{invoices.map((booking) => <article className="workspace-card invoice-list-card" key={booking.id}>
      <div><h2><bdi>{booking.invoice!.reference}</bdi></h2><p>{t("Booking reference", "مرجع الحجز")}: <bdi>{booking.id}</bdi></p><p>{booking.invoice!.issueDate ?? t("Issue date not supplied", "تاريخ الإصدار غير مقدم")}</p></div>
      <div className="invoice-list-status"><Lifecycle status={booking.invoice!.lifecycle} /><Settlement status={booking.invoice!.settlement} /></div>
      <Link className="button button--outline" to={`/bookings/${booking.id}/invoice`}>{t("View invoice", "عرض الفاتورة")}</Link>
    </article>)}</div> : <SystemState title={query ? t("No invoices match", "لا توجد فواتير مطابقة") : t("No invoice records", "لا توجد فواتير")} description={t("No invoice document data is available in this workspace yet.", "لا تتوفر بيانات مستندات فواتير في مساحة العمل حاليًا.")} />}
  </Workspace>;
}

export function InvoiceDetailPage() {
  const { id } = useParams();
  const { locale, t } = useLocale();
  const { records, profile } = useDemo();
  const booking = records.find((record) => record.id === id);
  const invoice = booking?.invoice;
  const hotel = hotels.find((item) => item.id === booking?.hotelId);
  if (!booking || !invoice || !hotel) return <Workspace title={t("Invoice", "الفاتورة")}>
    <SystemState title={t("Invoice not available", "الفاتورة غير متاحة")} description={t("This booking has no invoice document data. No invoice number or financial values have been generated.", "لا يحتوي هذا الحجز على بيانات مستند فاتورة. لم يتم إنشاء رقم فاتورة أو قيم مالية.")}>
      <Link to={booking ? `/bookings/${booking.id}` : "/bookings"}>{t("Return to booking", "العودة إلى الحجز")}</Link>
    </SystemState>
  </Workspace>;
  const amount = (value: number) => formatMoney(value, invoice.currency, locale);
  const referenceLabel = invoice.referenceType === "official" ? t("Invoice reference", "مرجع الفاتورة") : t("Local preview reference", "مرجع معاينة محلية");
  return <Workspace title={t("Invoice", "الفاتورة")}>
    <div className="workspace-actions no-print"><button type="button" className="button button--primary" onClick={() => window.print()}>{t("Print invoice", "طباعة الفاتورة")}</button><Link to={`/bookings/${booking.id}`}>{t("Back to booking", "العودة إلى الحجز")}</Link></div>
    <article className="workspace-card invoice-document">
      <header className="invoice-document-header"><div><p className="workspace-eyebrow">{t("ROYAL VACATION · AGENCY DOCUMENT", "رويال فاكيشن · مستند الوكالة")}</p><h2>{t("Invoice document", "مستند الفاتورة")}</h2></div><div><Lifecycle status={invoice.lifecycle} /><Settlement status={invoice.settlement} /></div></header>
      {invoice.referenceType === "local_preview" && <p className="invoice-preview-notice">{t("Local preview only. This is not a legally issued tax invoice.", "معاينة محلية فقط. لا تُعد فاتورة ضريبية صادرة قانونًا.")}</p>}
      <dl className="invoice-facts"><div><dt>{referenceLabel}</dt><dd><bdi>{invoice.reference}</bdi></dd></div><div><dt>{t("Booking reference", "مرجع الحجز")}</dt><dd><bdi>{booking.id}</bdi></dd></div><div><dt>{t("Issue date", "تاريخ الإصدار")}</dt><dd>{invoice.issueDate ?? "—"}</dd></div><div><dt>{t("Agency", "الوكالة")}</dt><dd>{profile.name}</dd></div><div><dt>{t("Agency contact", "جهة اتصال الوكالة")}</dt><dd><bdi>{profile.email}</bdi></dd></div><div><dt>{t("Service", "الخدمة")}</dt><dd>{hotelDisplayName(hotel.name[locale])}<br />{hotelDisplayAddress(hotel.address[locale], locale)}</dd></div><div><dt>{t("Stay dates", "تواريخ الإقامة")}</dt><dd><bdi>{booking.checkIn} – {booking.checkOut}</bdi></dd></div></dl>
      <div className="invoice-table-scroll"><table className="invoice-table"><thead><tr><th>{t("Description", "الوصف")}</th><th>{t("Amount", "المبلغ")}</th></tr></thead><tbody>{invoice.lineItems.map((line, index) => <tr key={`${line.description}-${index}`}><td>{line.description}</td><td><bdi>{amount(line.amountMinor)}</bdi></td></tr>)}</tbody></table></div>
      <dl className="invoice-totals"><div><dt>{t("Subtotal", "الإجمالي الفرعي")}</dt><dd><bdi>{amount(invoice.subtotalMinor)}</bdi></dd></div>{invoice.taxAndFeesMinor !== undefined && <div><dt>{t("Taxes and fees", "الضرائب والرسوم")}</dt><dd><bdi>{amount(invoice.taxAndFeesMinor)}</bdi></dd></div>}<div className="invoice-grand-total"><dt>{t("Total", "الإجمالي")}</dt><dd><bdi>{amount(invoice.totalMinor)}</bdi></dd></div></dl>
      <p className="invoice-settlement-note"><Icon name="info" />{t("Invoice lifecycle and payment settlement are shown separately. Settlement is displayed only from the supplied invoice record.", "تُعرض دورة حياة الفاتورة وتسوية الدفع كلٌ على حدة. وتُعرض التسوية من سجل الفاتورة المقدم فقط.")}</p>
    </article>
  </Workspace>;
}

const reviewStatuses: readonly AccountingReviewStatus[] = ["not_submitted", "pending_review", "approved", "rejected", "reconciled"];
function reviewStatusLabel(status: AccountingReviewStatus, t: (en: string, ar?: string) => string) {
  return {
    not_submitted: t("Not Submitted", "لم يُرسل"),
    pending_review: t("Pending Review", "قيد المراجعة"),
    approved: t("Approved", "موافق عليه"),
    rejected: t("Rejected", "مرفوض"),
    reconciled: t("Reconciled", "تمت التسوية"),
  }[status];
}

export function AccountingReviewPage() {
  const { locale, t } = useLocale();
  const { records } = useDemo();
  const items = records.filter((booking) => booking.paymentReview);
  return <Workspace title={t("Accounting Review", "مراجعة الحسابات")}>
    <p className="accounting-local-note">{t("Frontend preview only. No payment approval, reconciliation or settlement is performed here.", "معاينة للواجهة فقط. لا تتم الموافقة على الدفع أو المطابقة أو التسوية هنا.")}</p>
    <section className="workspace-card accounting-status-key" aria-labelledby="accounting-status-title"><h2 id="accounting-status-title">{t("Review status definitions", "تعريفات حالات المراجعة")}</h2><ul>{reviewStatuses.map((status) => <li key={status}><span className="status-badge">{reviewStatusLabel(status, t)}</span></li>)}</ul></section>
    {items.length ? <section className="workspace-card"><h2>{t("Payment review records", "سجلات مراجعة الدفع")}</h2><ul className="accounting-records">{items.map((booking) => <li key={booking.id}><Link to={`/bookings/${booking.id}`}>{booking.id}</Link><span>{reviewStatusLabel(booking.paymentReview!.status, t)}</span>{booking.paymentReview!.submittedAt && <time dateTime={booking.paymentReview!.submittedAt}>{booking.paymentReview!.submittedAt}</time>}{booking.paymentReview!.amountMinor !== undefined && booking.paymentReview!.currency && <bdi>{formatMoney(booking.paymentReview!.amountMinor, booking.paymentReview!.currency, locale)}</bdi>}</li>)}</ul></section> : <SystemState title={t("No payment reviews", "لا توجد مراجعات دفع")} description={t("No payment review records have been supplied for this workspace.", "لم تُقدم سجلات مراجعة دفع لمساحة العمل هذه.")} />}
  </Workspace>;
}
