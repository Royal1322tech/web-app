import { NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { CatalogShell } from "@/features/hotels/components/catalog-shell";
import { useLocale } from "@/features/localization/locale-provider";
import { hotels } from "@/features/hotels/data/hotels.fixture";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { samplePriceBreakdown } from "@/features/hotels/lib/sample-stay";
import { totalFor, useDemo } from "./demo-provider";
import type { DemoSelection, DemoStatus } from "./types";
import "./workspace.css";
export function useMoney() {
  const { locale } = useLocale();
  return (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
    }).format(amount);
}
export function Workspace({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const { t } = useLocale();
  const { demoSessionActive, signOut } = useDemo();
  const navigate = useNavigate();
  return (
    <CatalogShell title={title}>
      <div className="workspace">
        <p className="workspace-eyebrow">
          {eyebrow ??
            t(
              "ROYAL VACATION · PARTNER WORKSPACE",
              "رويال فاكيشن · مساحة الشركاء",
            )}
        </p>
        <h1>{title}</h1>
        <nav
          className="workspace-nav"
          aria-label={t("Workspace navigation", "التنقل في مساحة العمل")}
        >
          <NavLink to="/group-quotation">{t("Group quotation", "عرض سعر للمجموعات")}</NavLink>
          <NavLink to="/bookings">{t("Bookings", "الحجوزات")}</NavLink>
          <NavLink to="/car-rental/bookings">
            {t("Rentals", "التأجيرات")}
          </NavLink>
          <NavLink to="/agency">{t("Agency profile", "ملف الوكالة")}</NavLink>
          <NavLink to="/wallet">
            {t("Credit balance", "الرصيد الائتماني")}
          </NavLink>
          <NavLink to="/transactions">{t("Transactions", "المعاملات")}</NavLink>
          <NavLink to="/notifications">
            {t("Notifications", "الإشعارات")}
          </NavLink>
          {demoSessionActive && (
            <button
              className="text-button"
              type="button"
              onClick={() => {
                signOut();
                navigate("/welcome", { replace: true });
              }}
            >
              {t("Sign Out", "تسجيل الخروج")}
            </button>
          )}
        </nav>
        {children}
      </div>
    </CatalogShell>
  );
}
export function DemoNotice() {
  const { t } = useLocale();
  return (
    <p className="demo-notice">
      {t(
        "DEMO ONLY · No reservation, payment or supplier change. Use fictional guest details. Booking data resets on refresh; demo access persists until Sign Out.",
        "عرض تجريبي فقط · لا يوجد حجز أو دفع أو تغيير لدى المورد. استخدم بيانات ضيوف وهمية. تُمسح بيانات الحجز عند التحديث؛ يستمر الدخول التجريبي حتى تسجيل الخروج.",
      )}
    </p>
  );
}
export function StatusBadge({ status }: { status: DemoStatus | "completed" }) {
  const { t } = useLocale();
  const labels = {
    confirmed: t("Confirmed", "مؤكد"),
    pending: t("Pending", "معلق"),
    failed: t("Failed", "فشل"),
    cancelled: t("Cancelled", "ملغى"),
    completed: t("Completed", "مكتمل"),
  };
  return (
    <span className={`status-badge status-badge--${status}`}>
      {labels[status]} · {t("Demo", "تجريبي")}
    </span>
  );
}
export function SelectionSummary({ selection }: { selection: DemoSelection }) {
  const { locale, t } = useLocale();
  const money = useMoney();
  const hotel = hotels.find((h) => h.id === selection.hotelId)!;
  const nights = samplePriceBreakdown(
    selection.rate.nightlyRate,
    selection.criteria,
  ).nights;
  return (
    <aside className="workspace-card selection-summary">
      <ResponsiveImage
        src={hotel.photos[0].src}
        alt={hotel.name[locale]}
        width={hotel.photos[0].width}
        height={hotel.photos[0].height}
        sizes="(max-width: 800px) 100vw, 340px"
      />
      <p className="workspace-eyebrow">
        {t("YOUR SELECTED STAY", "إقامتك المختارة")}
      </p>
      <h2>{hotel.name[locale]}</h2>
      <p>{hotel.address[locale]}</p>
      <hr />
      <h3>{selection.room.name[locale]}</h3>
      <p>{selection.rate.board[locale]}</p>
      <dl className="summary-dl">
        <div>
          <dt>{t("Check in", "الوصول")}</dt>
          <dd>
            <bdi>{selection.criteria.checkIn}</bdi>
          </dd>
        </div>
        <div>
          <dt>{t("Check out", "المغادرة")}</dt>
          <dd>
            <bdi>{selection.criteria.checkOut}</bdi>
          </dd>
        </div>
        <div>
          <dt>{t("Rooms / nights", "الغرف / الليالي")}</dt>
          <dd>
            {selection.criteria.rooms.length} / {nights}
          </dd>
        </div>
        <div>
          <dt>{t("Adults / children", "البالغون / الأطفال")}</dt>
          <dd>
            {selection.criteria.rooms.reduce((n, r) => n + r.adults, 0)} /{" "}
            {selection.criteria.rooms.reduce(
              (n, r) => n + r.childAges.length,
              0,
            )}
          </dd>
        </div>
        <div>
          <dt>{t("Per room / night", "لكل غرفة / ليلة")}</dt>
          <dd>
            <bdi>{money(selection.rate.nightlyRate)}</bdi>
          </dd>
        </div>
        <div className="summary-total">
          <dt>{t("Demo total", "الإجمالي التجريبي")}</dt>
          <dd>
            <bdi>{money(totalFor(selection))}</bdi>
          </dd>
        </div>
      </dl>
      <p className="fine-print">
        {t(
          "Illustrative room subtotal. No taxes or fees have been supplied; this is not a payable quote. Non-refundable sample rate.",
          "إجمالي الغرف التوضيحي. لم تُقدّم ضرائب أو رسوم؛ هذا ليس عرض سعر قابل للدفع. سعر تجريبي غير قابل للاسترداد.",
        )}
      </p>
    </aside>
  );
}
