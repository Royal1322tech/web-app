import { DemoSessionGate } from "@/features/demo/session-gate";
import {
  PageLoadingState,
  InlineLoadingState,
} from "@/components/ui/system-state";
import { useEffect, useRef } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigation,
} from "react-router-dom";
import { LocaleProvider } from "@/features/localization/locale-provider";
import { PageTitle } from "@/components/layout/page-title";

function Root() {
  const { pathname } = useLocation();
  const navigation = useNavigation();
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = content.current?.animate(
      [{ transform: "translateY(6px)" }, { transform: "translateY(0)" }],
      { duration: 260, easing: "ease-out" },
    );
    return () => animation?.cancel();
  }, [pathname]);
  useEffect(() => {
    const privatePage = [
      "/forgot-password",
      "/verify-otp",
      "/reset-password",
    ].includes(pathname);
    if (!privatePage) return;
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.append(meta);
    return () => meta.remove();
  }, [pathname]);
  return (
    <LocaleProvider>
      {navigation.state !== "idle" && (
        <div className="route-loading">
          <InlineLoadingState />
        </div>
      )}
      <div ref={content} className="route-entrance">
        <DemoSessionGate />
      </div>
      <ScrollRestoration />
    </LocaleProvider>
  );
}

function RouteError() {
  return (
    <main className="registration-page">
      <h1>Unable to load this page</h1>
      <p>Please refresh and try again.</p>
      <a href="/">Return home</a>
    </main>
  );
}

function page(
  load: () => Promise<{ default: React.ComponentType }>,
  title: string,
  arabicTitle?: string,
) {
  return async () => {
    const { default: Page } = await load();
    return {
      Component: () => (
        <>
          <PageTitle en={title} ar={arabicTitle} />
          <Page />
        </>
      ),
    };
  };
}

export const router = createBrowserRouter([
  {
    Component: Root,
    ErrorBoundary: RouteError,
    HydrateFallback: PageLoadingState,
    children: [
      {
        index: true,
        lazy: page(() => import("@/pages/home"), "Home", "الرئيسية"),
      },
      { path: "contact", lazy: async () => ({ Component: (await import("@/features/enquiries/enquiry-page")).EnquiryPage }) },
      { path: "group-quotation", lazy: async () => { const { EnquiryPage } = await import("@/features/enquiries/enquiry-page"); return { Component: () => <EnquiryPage group /> }; } },
      {
        path: "welcome",
        lazy: page(() => import("@/pages/welcome"), "Welcome", "مرحبًا"),
      },
      { path: "login", lazy: page(() => import("@/pages/login"), "Partner Sign In", "تسجيل دخول الشركاء") },
      {
        path: "forgot-password",
        lazy: page(() => import("@/pages/forgot-password"), "Forgot Password", "نسيت كلمة المرور"),
      },
      {
        path: "verify-otp",
        lazy: page(() => import("@/pages/verify-otp"), "Verify Code", "رمز التحقق"),
      },
      {
        path: "reset-password",
        lazy: page(() => import("@/pages/reset-password"), "Reset Password", "إعادة تعيين كلمة المرور"),
      },
      {
        path: "search",
        lazy: page(() => import("@/pages/search"), "Hotel Search", "البحث عن فنادق"),
      },
      {
        path: "favourites",
        lazy: page(() => import("@/pages/favourites"), "Favourites", "المفضلة"),
      },
      {
        path: "bookings",
        lazy: page(() => import("@/pages/bookings"), "My Bookings", "حجوزاتي"),
      },
      {
        path: "hotels/:hotelId",
        lazy: async () => ({
          Component: (await import("@/pages/hotel")).default,
        }),
      },
      {
        path: "register/agency",
        lazy: async () => ({
          Component: (await import("@/pages/registration-layout")).default,
        }),
        children: [
          { index: true, element: <Navigate to="company" replace /> },
          {
            path: "company",
            lazy: page(() => import("@/pages/company"), "Company Information", "Company Information"),
          },
          {
            path: "contact",
            lazy: page(() => import("@/pages/contact"), "Contact Information", "Contact Information"),
          },
          {
            path: "documents",
            lazy: page(() => import("@/pages/documents"), "Upload Documents", "Upload Documents"),
          },
          {
            path: "review",
            lazy: page(() => import("@/pages/review"), "Review & Submit", "Review & Submit"),
          },
        ],
      },
      {
        path: "booking/summary",
        lazy: async () => ({
          Component: (await import("@/features/demo/checkout"))
            .BookingSummaryPage,
        }),
      },
      {
        path: "booking/guests",
        lazy: async () => ({
          Component: (await import("@/features/demo/checkout"))
            .GuestInformationPage,
        }),
      },
      {
        path: "booking/policy",
        lazy: async () => ({ Component: (await import("@/features/demo/checkout")).CancellationPolicyPage }),
      },
      {
        path: "booking/payment",
        lazy: async () => ({
          Component: (await import("@/features/demo/checkout")).PaymentPage,
        }),
      },
      {
        path: "booking/result",
        lazy: async () => ({
          Component: (await import("@/features/demo/checkout"))
            .BookingPreparedPage,
        }),
      },
      {
        path: "booking/result/:id",
        lazy: async () => ({
          Component: (await import("@/features/demo/checkout"))
            .BookingResultPage,
        }),
      },
      {
        path: "bookings/:id",
        lazy: async () => ({
          Component: (await import("@/features/demo/booking-detail"))
            .BookingDetailPage,
        }),
      },
      {
        path: "bookings/:id/voucher",
        lazy: async () => ({
          Component: (await import("@/features/demo/checkout")).VoucherPage,
        }),
      },
      // Booking-linked support tickets (frontend demo; creation only from an owned, recorded booking).
      { path: "bookings/:id/tickets/new", lazy: async () => { const { CreateTicketPage } = await import("@/features/tickets/create-ticket-page"); return { Component: () => <CreateTicketPage bookingType="hotel" /> }; } },
      { path: "car-rental/bookings/:id/tickets/new", lazy: async () => { const { CreateTicketPage } = await import("@/features/tickets/create-ticket-page"); return { Component: () => <CreateTicketPage bookingType="rental" /> }; } },
      { path: "tickets", lazy: async () => ({ Component: (await import("@/features/tickets/tickets-page")).MyTicketsPage }) },
      { path: "tickets/:reference", lazy: async () => ({ Component: (await import("@/features/tickets/ticket-detail-page")).TicketDetailPage }) },
      {
        path: "bookings/:id/invoice",
        handle: { workspace: true },
        lazy: async () => ({ Component: (await import("@/features/demo/invoices")).InvoiceDetailPage }),
      },
      {
        Component: Outlet,
        handle: { workspace: true },
        children: [
          { path: "points", lazy: async () => ({ Component: (await import("@/features/demo/points")).PointsPage }) },
          { path: "invoices", lazy: async () => ({ Component: (await import("@/features/demo/invoices")).InvoiceHistoryPage }) },
          { path: "accounting-review", lazy: async () => ({ Component: (await import("@/features/demo/invoices")).AccountingReviewPage }) },
          { path: "profile", lazy: async () => ({ Component: (await import("@/features/demo/profile-settings")).ProfilePage }) },
          { path: "account/settings", lazy: async () => ({ Component: (await import("@/features/demo/profile-settings")).AccountSettingsPage }) },
          {
            path: "agency",
            lazy: async () => ({
              Component: (await import("@/features/demo/account")).AgencyPage,
            }),
          },
          {
            path: "agency/edit",
            lazy: async () => ({
              Component: (await import("@/features/demo/account"))
                .EditAgencyPage,
            }),
          },
          {
            path: "notifications",
            lazy: async () => ({
              Component: (await import("@/features/demo/account"))
                .NotificationsPage,
            }),
          },
          {
            path: "verify-email",
            lazy: async () => ({
              Component: (await import("@/features/demo/account"))
                .EmailVerificationPage,
            }),
          },
          {
            path: "wallet",
            lazy: async () => ({
              Component: (await import("@/features/demo/finance")).WalletPage,
            }),
          },
          {
            path: "transactions",
            lazy: async () => ({
              Component: (await import("@/features/demo/finance"))
                .TransactionsPage,
            }),
          },
        ],
      },
      {
        path: "car-rental",
        lazy: page(() => import("@/pages/car-rental"), "Car Rental", "تأجير السيارات"),
      },
      {
        path: "car-rental/search",
        lazy: async () => ({
          Component: (await import("@/features/car-rental/rental-results"))
            .RentalSearchPage,
        }),
      },
      {
        path: "car-rental/vehicles/:id",
        lazy: async () => ({
          Component: (await import("@/features/car-rental/rental-details"))
            .VehicleDetailsPage,
        }),
      },
      {
        path: "car-rental/summary",
        lazy: async () => ({
          Component: (await import("@/features/car-rental/rental-flow"))
            .RentalSummaryPage,
        }),
      },
      {
        path: "car-rental/driver",
        lazy: async () => ({
          Component: (await import("@/features/car-rental/rental-passenger"))
            .RentalDriverPage,
        }),
      },
      {
        path: "car-rental/review",
        lazy: async () => ({ Component: (await import("@/features/car-rental/rental-review")).RentalReviewPage }),
      },
      {
        path: "car-rental/payment",
        lazy: async () => ({
          Component: (await import("@/features/car-rental/rental-flow"))
            .RentalPaymentPage,
        }),
      },
      {
        path: "car-rental/bookings",
        lazy: async () => ({
          Component: (await import("@/features/car-rental/rental-flow"))
            .RentalBookingsPage,
        }),
      },
      {
        path: "car-rental/bookings/:id",
        lazy: async () => ({
          Component: (await import("@/features/car-rental/rental-flow"))
            .RentalBookingDetailsPage,
        }),
      },
      { path: "*", lazy: async () => ({ Component: (await import("./not-found-page")).NotFound }) },
    ],
  },
]);
