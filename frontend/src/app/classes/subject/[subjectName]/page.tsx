import SubjectDashboard from "@/pages/SubjectDashboard/SubjectDashboard";

export default async function Page({
  params,
}: {
  params: Promise<{ subjectName: string }>;
}) {
  const { subjectName } = await params;

  return (
    <SubjectDashboard
      subjectName={decodeURIComponent(subjectName)}
      backRoute="/classes"
      backText="Back to Classes"
      source="classes"
    />
  );
}
