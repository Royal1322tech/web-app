import { DemoSessionGate } from "@/features/demo/session-gate";
import { DemoProvider } from "@/features/demo/demo-provider";
import {
  PageLoadingState,
  InlineLoadingState,
} from "@/components/ui/system-state";
import { useEffect, useRef } from "react";
import {
  createBrowserRouter,
  Link,
  Navigate,
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigation,
} from "react-router-dom";
import { LocaleProvider } from "@/features/localization/locale-provider";

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
      <DemoProvider>
        {navigation.state !== "idle" && (
          <div className="route-loading">
            <InlineLoadingState />
          </div>
        )}
        <div ref={content} className="route-entrance">
          <DemoSessionGate />
        </div>
      </DemoProvider>
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

export function NotFound() {
  return (
    <main className="registration-page">
      <title>Page not found | Royal Vacation</title>
      <h1>Page not found</h1>
      <Link to="/">Return home</Link>
    </main>
  );
}

function page(
  load: () => Promise<{ default: React.ComponentType }>,
  title: string,
) {
  return async () => {
    const { default: Page } = await load();
    return {
      Component: () => (
        <>
          <title>{`${title} | Royal Vacation`}</title>
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
        lazy: page(() => import("@/pages/home"), "Travel Agency Workspace"),
      },
      { path: "contact", lazy: async () => ({ Component: (await import("@/features/enquiries/enquiry-page")).EnquiryPage }) },
      { path: "group-quotation", handle: { workspace: true }, lazy: async () => { const { EnquiryPage } = await import("@/features/enquiries/enquiry-page"); return { Component: () => <EnquiryPage group /> }; } },
      {
        path: "welcome",
        lazy: page(() => import("@/pages/welcome"), "Welcome"),
      },
      { path: "login", lazy: page(() => import("@/pages/login"), "Sign In") },
      {
        path: "forgot-password",
        lazy: page(() => import("@/pages/forgot-password"), "Forgot Password"),
      },
      {
        path: "verify-otp",
        lazy: page(() => import("@/pages/verify-otp"), "Verify Code"),
      },
      {
        path: "reset-password",
        lazy: page(() => import("@/pages/reset-password"), "Reset Password"),
      },
      {
        path: "search",
        lazy: page(() => import("@/pages/search"), "Hotel Search"),
      },
      {
        path: "favourites",
        lazy: page(() => import("@/pages/favourites"), "Favourites"),
      },
      {
        path: "bookings", handle: { workspace: true },
        lazy: page(() => import("@/pages/bookings"), "My Bookings"),
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
            lazy: page(() => import("@/pages/company"), "Company Information"),
          },
          {
            path: "contact",
            lazy: page(() => import("@/pages/contact"), "Contact Information"),
          },
          {
            path: "documents",
            lazy: page(() => import("@/pages/documents"), "Upload Documents"),
          },
          {
            path: "review",
            lazy: page(() => import("@/pages/review"), "Review & Submit"),
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
        path: "booking/payment",
        lazy: async () => ({
          Component: (await import("@/features/demo/checkout")).PaymentPage,
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
      {
        Component: Outlet,
        handle: { workspace: true },
        children: [
          { path: "points", lazy: async () => ({ Component: (await import("@/features/demo/points")).PointsPage }) },
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
        lazy: page(() => import("@/pages/car-rental"), "Car Rental"),
      },
      {
        path: "car-rental/search",
        lazy: async () => ({
          Component: (await import("@/features/car-rental/rental-flow"))
            .RentalSearchPage,
        }),
      },
      {
        path: "car-rental/vehicles/:id",
        lazy: async () => ({
          Component: (await import("@/features/car-rental/rental-flow"))
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
          Component: (await import("@/features/car-rental/rental-flow"))
            .RentalDriverPage,
        }),
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
      { path: "*", Component: NotFound },
    ],
  },
]);
