import { Suspense } from "react";
import { BookingsScreen } from "@/features/bookings/components/bookings-screen";
export default function Page() {
  return (
    <Suspense>
      <BookingsScreen />
    </Suspense>
  );
}
