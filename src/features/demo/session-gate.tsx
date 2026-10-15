import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isPublicAuthPath, safeDemoReturnTo } from "@/features/auth/demo-auth";
import { WelcomeScreen } from "@/features/welcome/components/welcome-screen";
import { useDemo } from "./demo-provider";

/** Frontend demo boundary, not backend authorization. Defaults to private. */
export function DemoSessionGate() {
  const { demoSessionActive } = useDemo();
  const location = useLocation();
  if (demoSessionActive) {
    if (/^\/login\/?$/.test(location.pathname)) return <Navigate to={safeDemoReturnTo(location.state)} replace />;
    if (/^\/welcome\/?$/.test(location.pathname)) return <Navigate to="/" replace />;
    return <Outlet />;
  }
  if (isPublicAuthPath(location.pathname)) return <Outlet />;
  if (location.pathname === "/") return <><title>Welcome | Royal Vacation</title><WelcomeScreen /></>;
  return <Navigate to="/welcome" replace state={{ from: location.pathname + location.search + location.hash }} />;
}
