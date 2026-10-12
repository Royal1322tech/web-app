import { Suspense } from "react";
import { SearchResults } from "@/features/hotels/components/search-results";
export default function Page() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
