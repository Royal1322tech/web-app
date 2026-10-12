import { Suspense } from "react";
import { Favourites } from "@/features/hotels/components/favourites";
export default function Page() {
  return (
    <Suspense>
      <Favourites />
    </Suspense>
  );
}
