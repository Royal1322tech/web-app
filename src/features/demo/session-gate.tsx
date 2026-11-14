import { Suspense, lazy, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isPublicAuthPath, safeDemoReturnTo } from "@/features/auth/demo-auth";
import { useAppSessionActive } from "@/features/auth/app-session";
import { apiAuthEnabled } from "@/features/auth/auth-config";
import { b2bSession, useB2BSession } from "@/features/auth/b2b-session";
import { SessionUnavailable } from "@/features/auth/components/session-unavailable";
import { ApiDataNotice } from "@/features/auth/components/api-data-notice";
import { PageLoadingState } from "@/components/ui/system-state";
import { PageTitle } from "@/components/layout/page-title";

const WelcomeScreen = lazy(async () => {
  const { WelcomeScreen } = await import("@/features/welcome/components/welcome-screen");
  return { default: WelcomeScreen };
});
const AuthenticatedDemoProvider = lazy(async () => {
  const { DemoProvider } = await import("./demo-provider");
  return { default: DemoProvider };
});

/** Frontend demo boundary, not backend authorization. Defaults to private. */
export function DemoSessionGate() {
  const demoSessionActive = useAppSessionActive();
  const b2b = useB2BSession();
  const location = useLocation();
  useEffect(() => { if (apiAuthEnabled) void b2bSession.start(); }, [b2b.status]);
  if (apiAuthEnabled && !isPublicAuthPath(location.pathname)) {
    // A restored real session is confirmed with the server before any private page renders.
    if (b2b.status === "verifying") return <PageLoadingState />;
    if (b2b.status === "unavailable") return <SessionUnavailable />;
    if (b2b.status === "signed-out" && b2b.reason && b2b.reason !== "signed-out") {
      return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
    }
  }
  if (demoSessionActive) {
    // Signed in: /login and its code step send the user on to where they were going.
    if (/^\/login(\/verify-otp)?\/?$/.test(location.pathname)) return <Navigate to={safeDemoReturnTo(location.state)} replace />;
    if (/^\/welcome\/?$/.test(location.pathname)) return <Navigate to="/" replace />;
    return <Suspense fallback={<PageLoadingState />}><AuthenticatedDemoProvider>{apiAuthEnabled && <ApiDataNotice />}<Outlet /></AuthenticatedDemoProvider></Suspense>;
  }
  if (isPublicAuthPath(location.pathname)) return <Outlet />;
  if (location.pathname === "/") return <><PageTitle en="Welcome" ar="مرحبًا" /><Suspense fallback={<PageLoadingState />}><WelcomeScreen /></Suspense></>;
  return <Navigate to="/welcome" replace state={{ from: location.pathname + location.search + location.hash }} />;
}
