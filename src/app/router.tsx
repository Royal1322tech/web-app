import { useEffect } from "react";
import {
  createBrowserRouter,
  Link,
  Navigate,
  Outlet,
  ScrollRestoration,
  useLocation,
} from "react-router-dom";
import { LocaleProvider } from "@/features/localization/locale-provider";

function Root() {
  const { pathname } = useLocation();
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
      <Outlet />
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
    children: [
      {
        index: true,
        lazy: page(() => import("@/pages/home"), "Hotels & Travel"),
      },
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
        path: "bookings",
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
      { path: "*", Component: NotFound },
    ],
  },
]);
