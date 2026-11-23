import { Suspense } from "react";
import { apiAuthEnabled } from "@/features/auth/auth-config";
import { BookingsScreen } from "@/features/bookings/components/bookings-screen";
import { LiveBookingsPage } from "@/features/bookings/live/live-bookings-pages";

/** Real company bookings with real sign-in; the labelled example list otherwise. */
export default function Page() {
  if (apiAuthEnabled) return <LiveBookingsPage />;
  return (
    <Suspense>
      <BookingsScreen />
    </Suspense>
  );
}
