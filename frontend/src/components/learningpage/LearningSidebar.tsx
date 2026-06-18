import { useState, useEffect } from "react";
import CategorySection from "./CategorySection";
import { getLearningData, LearningDataResponse } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

export default function LearningSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicParam = searchParams?.get("topic");

  const [data, setData] = useState<LearningDataResponse | null>(null);
  const [expandedCategories, setExpandedCategories] =
    useState<Record<string, boolean>>({
      curriculum: false,
      documents: true,
    });

  const [expandedSubjects, setExpandedSubjects] =
    useState<Record<string, boolean>>({});

  // Default to empty string until we fetch data or have URL param
  const [selectedTopicId, setSelectedTopicId] =
    useState<string>(topicParam || "");

  useEffect(() => {
    if (topicParam) {
      setSelectedTopicId(topicParam);
    }
  }, [topicParam]);

  useEffect(() => {
    if (data && data.sidebarData) {
      setExpandedSubjects((prev) => {
        const docExpanded: Record<string, boolean> = {};
        data.sidebarData.forEach((category: any) => {
          if (category.id === "documents" && category.subjects) {
            category.subjects.forEach((subj: any) => {
              docExpanded[subj.id] = true;
            });
          }
        });
        return {
          ...docExpanded,
          ...prev
        };
      });
    }
  }, [data]);

  const getStudentId = (): number => {
    if (typeof window !== "undefined") {
      const id = localStorage.getItem("user_id");
      return id ? parseInt(id, 10) : 1;
    }
    return 1;
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await getLearningData(topicParam || undefined, getStudentId());
        setData(response);
      } catch (error) {
        console.error("Failed to load learning data:", error);
      }
    }
    fetchData();
  }, [topicParam]);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleSubject = (id: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (!data) {
    return (
      <div className="bg-[#131826] w-[20vw] h-screen p-4 space-y-4 animate-pulse">
        <div className="h-10 bg-white/5 rounded-lg"></div>
        <div className="h-64 bg-white/5 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#131826] w-[20vw] h-full flex flex-col">
      <div className="py-4 px-4 shrink-0">
        <h2 className="text-[0.6rem] text-left uppercase tracking-[0.22em] pt-2 pb-3 text-white/55">
          Topic Navigator
        </h2>
        <div className="pb-4 flex justify-start border-b border-white/20">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-2 w-full">
            <input
              className="flex-1 w-full bg-transparent text-xs text-white placeholder:text-white/25 focus:outline-none"
              placeholder="Search topics…"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto purple-scrollbar text-white px-4 py-2 scrollbar-thin scrollbar-thumb-white/10">
        {data.sidebarData.map((category: any) => (
          <CategorySection
            key={category.id}
            category={category}
            expanded={expandedCategories[category.id]}
            expandedSubjects={expandedSubjects}
            selectedTopicId={selectedTopicId}
            onSelectTopic={(id) => {
              setSelectedTopicId(id);
              router.push(`/learning?topic=${encodeURIComponent(id)}`);
            }}
            onToggleCategory={toggleCategory}
            onToggleSubject={toggleSubject}
          />
        ))}
      </div>
    </div>
  )
}