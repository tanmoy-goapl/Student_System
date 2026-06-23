import PracticePage from "@/pages/PracticePage/PracticePage";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading Practice...</div>}>
      <PracticePage />
    </Suspense>
  );
}
