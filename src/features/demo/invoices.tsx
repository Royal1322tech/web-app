import { apiAuthEnabled } from "@/features/auth/auth-config";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { SystemState } from "@/components/ui/system-state";
import { useLocale } from "@/features/localization/locale-provider";
import { hotels } from "@/features/hotels/data/hotels.fixture";
import { hotelDisplayName } from "@/features/hotels/lib/presentation";
import { useDemo } from "./demo-provider";
import { buildInvoiceView, type InvoiceView } from "./booking-invoice";
import { formatInvoiceMoney, InvoiceDocument } from "./invoice-document";
import { StatusBadge, Workspace } from "./shared";
import type { AccountingReviewStatus, PaymentSettlementStatus } from "./types";
import { useState } from "react";
import { formatCalendarDate, formatDateTime } from "@/lib/format-date";

const formatMoney = formatInvoiceMoney;

function Lifecycle({ view }: { view: InvoiceView }) {
  const { t } = useLocale();
  if (view.source === "demo-preview") return <span className="hotel-demo-indicator">{t("Example", "مثال")}</span>;
  return <span className={`status-badge status-badge--${view.lifecycle}`}>{view.lifecycle === "issued" ? t("Issued", "صادر") : t("Draft", "مسودة")}</span>;
}

function Settlement({ status }: { status?: PaymentSettlementStatus }) {
  const { t } = useLocale();
  if (!status) return null;
  const label = {
    unpaid: t("Unpaid", "غير مدفوع"),
    partially_paid: t("Partially Paid", "مدفوع جزئيًا"),
    fully_settled: t("Fully Settled", "مسدد بالكامل"),
  }[status];
  return <span className="status-badge">{label}</span>;
}

export function InvoiceHistoryPage() {
  const { t, locale } = useLocale();
  const demo = useDemo();
  // With real sign-in there is no invoice API yet: example bookings are never shown as the company's.
  const records = apiAuthEnabled ? [] : demo.records;
  const [query, setQuery] = useState("");
  const invoices = records.flatMap((booking) => {
    const view = buildInvoiceView(booking);
    return view ? [{ booking, view }] : [];
  }).filter(({ booking, view }) => `${booking.id} ${booking.agencyReference} ${view.reference}`.toLowerCase().includes(query.toLowerCase()));
  return <Workspace title={t("Invoice History", "سجل الفواتير")}>
    {!apiAuthEnabled && <p className="workspace-intro">{t("Invoices for confirmed and cancelled bookings. Examples are built from example bookings and aren't issued documents.", "فواتير الحجوزات المؤكدة والملغاة. الأمثلة مبنية على حجوزات مثال وليست مستندات صادرة.")}</p>}
    {!apiAuthEnabled && <label className="invoice-search">{t("Search invoices", "البحث في الفواتير")}<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Invoice or booking reference", "مرجع الفاتورة أو الحجز")} /></label>}
    {invoices.length ? <div className="invoice-list">{invoices.map(({ booking, view }) => {
      const hotel = hotels.find((item) => item.id === booking.hotelId);
      return <article className="workspace-card invoice-list-card" key={booking.id}>
        <div><h2><bdi>{view.reference}</bdi></h2><p>{t("Booking reference", "مرجع الحجز")}: <bdi>{booking.id}</bdi>{hotel && <> · {hotelDisplayName(hotel.name[locale])}</>}</p><p>{view.issueDate ? formatCalendarDate(view.issueDate, locale) : t("Not issued", "لم تصدر")} · <bdi>{formatMoney(view.totalMinor, view.currency, locale)}</bdi></p></div>
        <div className="invoice-list-status"><StatusBadge status={booking.status} /><Lifecycle view={view} /><Settlement status={view.settlement} /></div>
        <Link className="button button--outline" to={`/bookings/${booking.id}/invoice`}>{t("View invoice", "عرض الفاتورة")}</Link>
      </article>;
    })}</div> : <SystemState title={query ? t("No invoices match", "لا توجد فواتير مطابقة") : t("No invoices yet", "لا توجد فواتير بعد")} description={apiAuthEnabled ? t("Invoices for your confirmed bookings will appear here. For a copy of an invoice now, contact Royal Vacation.", "ستظهر هنا فواتير حجوزاتك المؤكدة. للحصول على نسخة من فاتورة الآن، تواصل مع رويال فاكيشن.") : t("No invoice document data is available in this workspace yet.", "لا تتوفر بيانات مستندات فواتير في مساحة العمل حاليًا.")}>{apiAuthEnabled && <Link className="button button--outline" to="/contact">{t("Contact Royal Vacation", "تواصل مع رويال فاكيشن")}</Link>}</SystemState>}
  </Workspace>;
}

export function InvoiceDetailPage() {
  const { id } = useParams();
  const { t } = useLocale();
  const demo = useDemo();
  const { profile } = demo;
  const records = apiAuthEnabled ? [] : demo.records;
  const booking = records.find((record) => record.id === id);
  const view = booking && buildInvoiceView(booking);
  const hotel = hotels.find((item) => item.id === booking?.hotelId);
  // An invoice sits under Invoices (not under the booking list) for its breadcrumb and back link.
  const trail = [{ to: "/invoices", label: t("Invoice History", "سجل الفواتير") }];
  if (!booking || !view || !hotel) return <Workspace title={t("Invoice", "الفاتورة")} trail={trail}>
    <SystemState title={t("Invoice not available", "الفاتورة غير متاحة")} description={t("An invoice is available for confirmed and cancelled bookings only. No invoice number or financial values have been generated.", "تتوفر الفاتورة للحجوزات المؤكدة والملغاة فقط. لم يتم إنشاء رقم فاتورة أو قيم مالية.")}>
      <Link to="/invoices">{t("Back to invoices", "العودة إلى الفواتير")}</Link>
    </SystemState>
  </Workspace>;
  return <Workspace title={t("Invoice", "الفاتورة")} trail={trail}>
    <div className="invoice-toolbar no-print">
      <Link className="button button--outline invoice-toolbar__back" to="/invoices"><Icon name="back" aria-hidden="true" />{t("Back to invoices", "العودة إلى الفواتير")}</Link>
      <Link className="button button--outline" to={`/bookings/${booking.id}`}>{t("View booking", "عرض الحجز")}</Link>
      <button type="button" className="button button--primary" onClick={() => window.print()}><Icon name="printer" aria-hidden="true" />{t("Print / Save as PDF", "طباعة / حفظ PDF")}</button>
    </div>
    <InvoiceDocument booking={booking} hotel={hotel} profile={profile} view={view} />
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
  const demo = useDemo();
  const records = apiAuthEnabled ? [] : demo.records;
  const items = records.filter((booking) => booking.paymentReview);
  return <Workspace title={t("Accounting Review", "مراجعة الحسابات")}>
    <p className="accounting-local-note">{t("No payment approval, reconciliation or settlement happens on this page.", "لا تتم الموافقة على الدفع أو المطابقة أو التسوية في هذه الصفحة.")}</p>
    <section className="workspace-card accounting-status-key" aria-labelledby="accounting-status-title"><h2 id="accounting-status-title">{t("Review status definitions", "تعريفات حالات المراجعة")}</h2><ul>{reviewStatuses.map((status) => <li key={status}><span className="status-badge">{reviewStatusLabel(status, t)}</span></li>)}</ul></section>
    {items.length ? <section className="workspace-card"><h2>{t("Payment review records", "سجلات مراجعة الدفع")}</h2><ul className="accounting-records">{items.map((booking) => <li key={booking.id}><Link to={`/bookings/${booking.id}`}>{booking.id}</Link><span>{reviewStatusLabel(booking.paymentReview!.status, t)}</span>{booking.paymentReview!.submittedAt && <time dateTime={booking.paymentReview!.submittedAt}>{formatDateTime(booking.paymentReview!.submittedAt, locale)}</time>}{booking.paymentReview!.amountMinor !== undefined && booking.paymentReview!.currency && <bdi>{formatMoney(booking.paymentReview!.amountMinor, booking.paymentReview!.currency, locale)}</bdi>}</li>)}</ul></section> : <SystemState title={t("No payment reviews", "لا توجد مراجعات دفع")} description={t("No payment review records have been supplied for this workspace.", "لم تُقدم سجلات مراجعة دفع لمساحة العمل هذه.")} />}
  </Workspace>;
}
