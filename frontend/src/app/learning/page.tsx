import LearningPage from "@/pages/LearningPage/LearningPage";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading Learning...</div>}>
      <LearningPage />
    </Suspense>
  );
}
