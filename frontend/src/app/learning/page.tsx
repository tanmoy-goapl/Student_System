import LearningPage from "@/pages/LearningPage/LearningPage";
import { Suspense } from "react";
import { PageLoadingState } from "@/components/DashboardLoading";

export default function Page() {
  return (
    <Suspense fallback={<PageLoadingState text="Loading Learning..." />}>
      <LearningPage />
    </Suspense>
  );
}
