import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  isPublicAuthPath,
  safeDemoReturnTo,
} from "@/features/auth/demo-auth";
import {
  b2bSession,
  subscribeB2BSession,
} from "@/features/auth/api/b2b-session";
import { getB2BProfile } from "@/features/auth/api/b2b-auth";
import { ApiError } from "@/lib/api/client";
import { PageLoadingState } from "@/components/ui/system-state";
import { PageTitle } from "@/components/layout/page-title";

const WelcomeScreen = lazy(async () => {
  const { WelcomeScreen } = await import(
    "@/features/welcome/components/welcome-screen"
  );
  return { default: WelcomeScreen };
});

const AuthenticatedDemoProvider = lazy(async () => {
  const { DemoProvider } = await import("./demo-provider");
  return { default: DemoProvider };
});

export function DemoSessionGate() {
  const location = useLocation();
  const [session, setSession] = useState<
    "checking" | "authenticated" | "guest" | "unavailable"
  >("checking");

  useEffect(() => {
    let active = true;
    let requestId = 0;

    async function checkSession() {
      const currentRequest = ++requestId;
      const token = b2bSession.getToken();

      if (!token) {
        if (active) setSession("guest");
        return;
      }

      if (active) setSession("checking");

      try {
        await getB2BProfile(token);

        if (
          active &&
          currentRequest === requestId &&
          b2bSession.getToken() === token
        ) {
          setSession("authenticated");
        }
      } catch (error) {
        if (
          active &&
          currentRequest === requestId &&
          b2bSession.getToken() === token
        ) {
          if (error instanceof ApiError && error.status === 401) {
            b2bSession.clear();
            setSession("guest");
          } else {
            setSession("unavailable");
          }
        }
      }
    }

    void checkSession();

    const unsubscribe = subscribeB2BSession(() => {
      void checkSession();
    });

    return () => {
      active = false;
      requestId++;
      unsubscribe();
    };
  }, []);

  if (session === "checking") {
    return <PageLoadingState />;
  }

  if (session === "unavailable") {
    return (
      <main role="alert" style={{ padding: "3rem", textAlign: "center" }}>
        <p>Unable to verify your session. Please check your connection.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </main>
    );
  }

  if (session === "authenticated") {
    if (/^\/login\/?$/.test(location.pathname)) {
      return (
        <Navigate
          to={safeDemoReturnTo(location.state)}
          replace
        />
      );
    }

    if (/^\/welcome\/?$/.test(location.pathname)) {
      return <Navigate to="/" replace />;
    }

    return (
      <Suspense fallback={<PageLoadingState />}>
        <AuthenticatedDemoProvider>
          <Outlet />
        </AuthenticatedDemoProvider>
      </Suspense>
    );
  }

  if (isPublicAuthPath(location.pathname)) {
    return <Outlet />;
  }

  if (location.pathname === "/") {
    return (
      <>
        <PageTitle en="Welcome" ar="مرحبًا" />
        <Suspense fallback={<PageLoadingState />}>
          <WelcomeScreen />
        </Suspense>
      </>
    );
  }

  return (
    <Navigate
      to="/welcome"
      replace
      state={{
        from:
          location.pathname +
          location.search +
          location.hash,
      }}
    />
  );
}
