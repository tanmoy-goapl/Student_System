import PracticePage from "@/pages/PracticePage/PracticePage";
import { Suspense } from "react";
import { PageLoadingState } from "@/components/DashboardLoading";

export default function Page() {
  return (
    <Suspense fallback={<PageLoadingState text="Loading Practice..." />}>
      <PracticePage />
    </Suspense>
  );
}
