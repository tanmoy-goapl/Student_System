import SubjectDashboard from "@/pages/SubjectDashboard/SubjectDashboard";

export default async function Page({ params }: { params: Promise<{ subjectName: string }> }) {
  const { subjectName } = await params;
  const decodedSubjectName = decodeURIComponent(subjectName);
  return <SubjectDashboard subjectName={decodedSubjectName} />;
}
