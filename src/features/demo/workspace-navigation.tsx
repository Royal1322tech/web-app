import { apiAuthEnabled } from "@/features/auth/auth-config";
import { agencyProfileVisible } from "@/app/hidden-features";
import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { useDemo } from "./demo-provider";
import "./workspace.css";

export function WorkspaceNavigation() {
  const { t, locale } = useLocale();
  const { pathname } = useLocation();
  const invoicePage = /^\/bookings\/[^/]+\/invoice\/?$/.test(pathname);
  const { demoSessionActive, signOut } = useDemo();
  const navigate = useNavigate();
  const nav = useRef<HTMLDivElement>(null);
  const id = useId();
  const [edges, setEdges] = useState({ start: false, end: false });

  // Fade only the edges that hide more links, so overflow on small screens is discoverable.
  useEffect(() => {
    const element = nav.current;
    if (!element) return;
    const update = () => {
      const overflow = element.scrollWidth - element.clientWidth;
      const offset = Math.abs(element.scrollLeft);
      setEdges({ start: overflow > 1 && offset > 1, end: overflow > 1 && offset < overflow - 1 });
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [locale]);

  // Keep the current section visible when the bar scrolls horizontally.
  useEffect(() => {
    const element = nav.current;
    const active = element?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!element || !active || element.scrollWidth <= element.clientWidth) return;
    const bar = element.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    if (item.left < bar.left || item.right > bar.right) {
      element.scrollBy({ left: item.left + item.width / 2 - (bar.left + bar.width / 2) });
    }
  }, [pathname, locale]);

  return (
    <nav className="workspace-nav" aria-label={t("Workspace navigation", "التنقل في مساحة العمل")}>
      <div
        ref={nav}
        className="workspace-nav__track"
        data-overflow-start={edges.start || undefined}
        data-overflow-end={edges.end || undefined}
      >
        {/* Complete account map in three labelled groups. */}
        <div className="workspace-nav__group" role="group" aria-labelledby={`${id}-bookings`}>
          <p className="workspace-nav__label" id={`${id}-bookings`}>{t("Bookings", "الحجوزات")}</p>
          {/* An invoice page belongs to Invoices, so My Bookings isn't marked current there. */}
          {invoicePage ? <Link to="/bookings">{t("My Bookings", "حجوزاتي")}</Link> : <NavLink to="/bookings">{t("My Bookings", "حجوزاتي")}</NavLink>}
          <NavLink to="/car-rental/bookings">{t("My Rentals", "تأجيراتي")}</NavLink>
          <NavLink to="/tickets">{t("My Tickets", "تذاكري")}</NavLink>
          {/* Real sign-in: the company's customers and the price requests already on the API. */}
          {apiAuthEnabled && <NavLink to="/customers">{t("Customers", "العملاء")}</NavLink>}
          {apiAuthEnabled && <NavLink to="/price-requests">{t("Price Requests", "طلبات الأسعار")}</NavLink>}
          <NavLink to="/group-requests">{t("My Group Requests", "طلبات مجموعاتي")}</NavLink>
        </div>
        <div className="workspace-nav__group" role="group" aria-labelledby={`${id}-finance`}>
          <p className="workspace-nav__label" id={`${id}-finance`}>{t("Finance", "المالية")}</p>
          <NavLink to="/wallet">{t("Wallet", "المحفظة")}</NavLink>
          <NavLink to="/transactions">{t("Transactions", "المعاملات")}</NavLink>
          {invoicePage ? <Link to="/invoices" aria-current="page" className="active">{t("Invoices", "الفواتير")}</Link> : <NavLink to="/invoices">{t("Invoices", "الفواتير")}</NavLink>}
          <NavLink to="/accounting-review">{t("Accounting Review", "مراجعة الحسابات")}</NavLink>
          <NavLink to="/points">{t("Points", "النقاط")}</NavLink>
        </div>
        <div className="workspace-nav__group" role="group" aria-labelledby={`${id}-account`}>
          <p className="workspace-nav__label" id={`${id}-account`}>{t("Account", "الحساب")}</p>
          <NavLink to="/profile">{t("My Profile", "ملفي الشخصي")}</NavLink>
          {agencyProfileVisible && <NavLink to="/agency">{t("Agency Profile", "ملف الوكالة")}</NavLink>}
          <NavLink to="/notifications">{t("Notifications", "الإشعارات")}</NavLink>
          <NavLink to="/account/settings">{t("Account Settings", "إعدادات الحساب")}</NavLink>
          {demoSessionActive && (
            <button
              className="workspace-nav__sign-out"
              type="button"
              onClick={() => {
                void signOut().then((result) => navigate(result === "confirmed" ? "/welcome" : "/login", { replace: true, state: result === "confirmed" ? undefined : { notice: "logout-unconfirmed" } }));
              }}
            >
              <Icon name="signOut" />
              {t("Sign Out", "تسجيل الخروج")}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
