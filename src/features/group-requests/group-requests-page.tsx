import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SystemState } from "@/components/ui/system-state";
import { Icon } from "@/components/ui/icon";
import { useDemo } from "@/features/demo/demo-provider";
import { Workspace } from "@/features/demo/shared";
import { useLocale } from "@/features/localization/locale-provider";
import { formatCalendarDate } from "@/lib/format-date";
import { GroupOrigin, GroupStatusBadge, useServiceLabel } from "./group-request-ui";
import "./group-requests.css";

const PAGE_SIZE = 5;

export function MyGroupRequestsPage() {
  const { t, locale } = useLocale();
  const { groupRequests } = useDemo();
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(groupRequests.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = groupRequests.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const newRequest = <Link className="button button--primary" to="/group-quotation"><Icon name="plus" />{t("New Group Request", "طلب مجموعة جديد")}</Link>;
  return (
    <Workspace title={t("My Group Requests", "طلبات مجموعاتي")}>
      <div className="group-list__intro">
        <p>{t("Track the status of your group requests.", "تابع حالة طلبات مجموعاتك.")} <span className="group-list__legend">{t("Sample requests", "طلبات نموذجية")}</span> {t("are illustrative examples, and demo requests stay in this session. None of them have been sent to Royal Vacation.", "هي أمثلة توضيحية، والطلبات التجريبية تبقى في هذه الجلسة. لم يُرسل أي منها إلى رويال فاكيشن.")}</p>
        {newRequest}
      </div>
      {!groupRequests.length ? (
        <SystemState title={t("No group requests yet", "لا توجد طلبات مجموعات بعد")} description={t("Prepare a group quotation to see it here.", "جهز عرض سعر لمجموعة ليظهر هنا.")} />
      ) : (
        <>
          <div className="group-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">{t("Request Reference", "مرجع الطلب")}</th>
                  <th scope="col">{t("Destination", "الوجهة")}</th>
                  <th scope="col">{t("Travel Dates", "تواريخ السفر")}</th>
                  <th scope="col">{t("Guests", "الضيوف")}</th>
                  <th scope="col">{t("Status", "الحالة")}</th>
                  <th scope="col">{t("Action", "الإجراء")}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((request) => (
                  <tr key={request.reference}>
                    <td data-label={t("Request Reference", "مرجع الطلب")}><strong><bdi>{request.reference}</bdi></strong><GroupOrigin origin={request.origin} /></td>
                    <td data-label={t("Destination", "الوجهة")}>{request.destination}</td>
                    <td data-label={t("Travel Dates", "تواريخ السفر")}><span><time dateTime={request.start}>{formatCalendarDate(request.start, locale)}</time> – <time dateTime={request.end}>{formatCalendarDate(request.end, locale)}</time></span></td>
                    <td data-label={t("Guests", "الضيوف")}>{request.passengers}</td>
                    <td data-label={t("Status", "الحالة")}><GroupStatusBadge status={request.status} /></td>
                    <td data-label={t("Action", "الإجراء")}>
                      <Link className="button button--outline" to={`/group-requests/${encodeURIComponent(request.reference)}`} aria-label={t(`View ${request.reference}`, `عرض ${request.reference}`)}>{t("View", "عرض")}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <nav className="group-pagination" aria-label={t("Group request pages", "صفحات طلبات المجموعات")}>
              <button type="button" className="button button--outline" disabled={current === 1} onClick={() => setPage(current - 1)}>{t("Previous", "السابق")}</button>
              <span aria-live="polite">{t(`Page ${current} / ${pages}`, `صفحة ${current} / ${pages}`)}</span>
              <button type="button" className="button button--outline" disabled={current === pages} onClick={() => setPage(current + 1)}>{t("Next", "التالي")}</button>
            </nav>
          )}
        </>
      )}
    </Workspace>
  );
}

export function GroupRequestDetailPage() {
  const { reference } = useParams();
  const { t, locale } = useLocale();
  const { groupRequests } = useDemo();
  const serviceLabel = useServiceLabel();
  const request = groupRequests.find((item) => item.reference === reference);
  const back = <Link className="button button--outline" to="/group-requests"><Icon name="back" />{t("Back to My Group Requests", "العودة إلى طلبات مجموعاتي")}</Link>;
  if (!request) {
    return (
      <Workspace title={t("Group request not found", "طلب المجموعة غير موجود")}>
        <SystemState title={t("This request isn't available", "هذا الطلب غير متاح")} description={t("Requests saved in this session are removed when the page is reloaded.", "تُحذف الطلبات المحفوظة في هذه الجلسة عند إعادة تحميل الصفحة.")}>{back}</SystemState>
      </Workspace>
    );
  }
  const rows: [string, string][] = [
    [t("Destination", "الوجهة"), request.destination],
    [t("Departure date", "تاريخ المغادرة"), formatCalendarDate(request.start, locale)],
    [t("End date", "تاريخ النهاية"), formatCalendarDate(request.end, locale)],
    [t("Passengers", "المسافرون"), String(request.passengers)],
    ...(request.rooms ? [[t("Rooms needed", "الغرف المطلوبة"), String(request.rooms)] as [string, string]] : []),
    [t("Requested services", "الخدمات المطلوبة"), serviceLabel(request.service)],
    [t("Name", "الاسم"), request.name],
    [t("Email", "البريد الإلكتروني"), request.email],
    [t("Agency / company", "الوكالة / الشركة"), request.agency],
    [t("Subject", "الموضوع"), request.subject],
  ];
  return (
    <Workspace title={t("Group request details", "تفاصيل طلب المجموعة")} trail={[{ to: "/group-requests", label: t("My Group Requests", "طلبات مجموعاتي") }]}>
      <section className="workspace-card group-detail">
        <div className="group-detail__head">
          <div>
            <span>{t("Request Reference", "مرجع الطلب")}</span>
            <strong><bdi>{request.reference}</bdi></strong>
          </div>
          <div className="group-detail__badges"><GroupStatusBadge status={request.status} /><GroupOrigin origin={request.origin} /></div>
        </div>
        <p className="group-detail__note">{t("Not sent to Royal Vacation. This is not a hotel booking.", "لم يُرسل إلى رويال فاكيشن، وهذا ليس حجز فندق.")}</p>
        <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <h2>{t("Message / requirements", "الرسالة / المتطلبات")}</h2>
        <p className="group-detail__message" dir="auto">{request.message}</p>
        <div className="workspace-actions">{back}</div>
      </section>
    </Workspace>
  );
}
