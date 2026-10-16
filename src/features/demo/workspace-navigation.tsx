import { NavLink, useNavigate } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { useDemo } from "./demo-provider";
import "./workspace.css";
export function WorkspaceNavigation() {
 const { t } = useLocale();
 const { demoSessionActive, signOut } = useDemo();
 const navigate = useNavigate();
 return (
        <nav
          className="workspace-nav"
          aria-label={t("Workspace navigation", "التنقل في مساحة العمل")}
        >
          <NavLink to="/profile">{t("My Profile", "ملفي الشخصي")}</NavLink>
          <NavLink to="/points">{t("Points", "النقاط")}</NavLink>
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
 );
}
