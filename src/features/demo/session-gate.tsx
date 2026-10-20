import { Suspense, lazy, useSyncExternalStore } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { demoAuth, isPublicAuthPath, safeDemoReturnTo, subscribeDemoSession } from "@/features/auth/demo-auth";
import { PageLoadingState } from "@/components/ui/system-state";

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
  const demoSessionActive = useSyncExternalStore(subscribeDemoSession, demoAuth.isActive, () => false);
  const location = useLocation();
  if (demoSessionActive) {
    if (/^\/login\/?$/.test(location.pathname)) return <Navigate to={safeDemoReturnTo(location.state)} replace />;
    if (/^\/welcome\/?$/.test(location.pathname)) return <Navigate to="/" replace />;
    return <Suspense fallback={<PageLoadingState />}><AuthenticatedDemoProvider><Outlet /></AuthenticatedDemoProvider></Suspense>;
  }
  if (isPublicAuthPath(location.pathname)) return <Outlet />;
  if (location.pathname === "/") return <><title>Welcome | Royal Vacation</title><Suspense fallback={<PageLoadingState />}><WelcomeScreen /></Suspense></>;
  return <Navigate to="/welcome" replace state={{ from: location.pathname + location.search + location.hash }} />;
}
