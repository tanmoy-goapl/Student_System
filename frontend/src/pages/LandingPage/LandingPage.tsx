"use client";

import ResumeSteps from "@/components/ResumeSteps";
import LearningFeature from "@/components/LearningFeature";
import Information from "@/components/Information";
import StartLearning from "@/components/StartLearning";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LandingPageTop from "../../components/LandingPageTop";

export default function LandingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    const authenticated = !!userId && !!role;
    setIsAuthenticated(authenticated);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      router.replace("/login?next=/");
    }
  }, [ready, isAuthenticated, router]);

  if (!ready) return null;

  if (!isAuthenticated) {
    return <p className="text-white">Redirecting...</p>;
  }

  return (
    <>
      <LandingPageTop />
      <ResumeSteps />
      <LearningFeature />
      <Information />
      <StartLearning />
    </>
  );
}
