import { useState, useEffect, memo } from "react";
import CategorySection from "./CategorySection";
import { LearningDataResponse } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

interface LearningSidebarProps {
  data: LearningDataResponse | null;
  onSelectTopic: (id: string, subjectId?: string) => void;
  roadmapId?: string;
}

const LearningSidebar = memo(function LearningSidebar({ data, onSelectTopic, roadmapId }: LearningSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicParam = searchParams?.get("topic");
  const currentRoadmapId = roadmapId || searchParams?.get("roadmap_id") || "";
  const source = searchParams?.get("source") || "courses";

  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [expandedCategories, setExpandedCategories] =
    useState<Record<string, boolean>>({});

  const [expandedSubjects, setExpandedSubjects] =
    useState<Record<string, boolean>>({});

  const [selectedTopicId, setSelectedTopicId] =
    useState<string>(topicParam || "");

  useEffect(() => {
    if (topicParam) {
      setSelectedTopicId(topicParam);
    } else if (data?.selectedTopic) {
      setSelectedTopicId(data.selectedTopic);
    }
  }, [topicParam, data?.selectedTopic]);

  useEffect(() => {
    if (data && data.sidebarData) {
      setExpandedCategories((prev) => {
        const catExpanded: Record<string, boolean> = {};
        const currentTopic = data.selectedTopic || topicParam;
        
        data.sidebarData.forEach((category: any) => {
          let hasSelectedTopic = false;
          if (category.subjects) {
            hasSelectedTopic = category.subjects.some((subj: any) =>
              subj.topics?.some(
                (t: any) =>
                  t.id === currentTopic ||
                  t.subtopics?.includes(currentTopic)
              )
            );
          } else if (category.topics) {
            hasSelectedTopic = category.topics.some(
              (t: any) =>
                t.id === currentTopic ||
                t.subtopics?.includes(currentTopic)
            );
          }
          if (hasSelectedTopic) {
            catExpanded[category.id] = true;
          }
        });
        return catExpanded;
      });

      setExpandedSubjects((prev) => {
        const docExpanded: Record<string, boolean> = {};
        const currentTopic = data.selectedTopic || topicParam;
        
        data.sidebarData.forEach((category: any) => {
          if (category.subjects) {
            category.subjects.forEach((subj: any) => {
              const hasSelectedTopic = subj.topics?.some(
                (t: any) =>
                  t.id === currentTopic ||
                  t.subtopics?.includes(currentTopic)
              );
              if (hasSelectedTopic) {
                docExpanded[subj.id] = true;
              }
            });
          }
        });
        return docExpanded;
      });
    }
  }, [data, topicParam]);

  const getStudentId = (): number => {
    if (typeof window !== "undefined") {
      const id = localStorage.getItem("user_id");
      return id ? parseInt(id, 10) : 1;
    }
    return 1;
  };

  useEffect(() => {
    async function fetchUserRoadmaps() {
      try {
        const studentId = getStudentId();
        const res = await fetch(`/api/roadmap/all/${studentId}`);
        const result = await res.json();
        if (result.success) {
          setRoadmaps(result.roadmaps);
        }
      } catch (e) {
        console.error("Failed to fetch roadmaps:", e);
      }
    }
    fetchUserRoadmaps();
  }, []);

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
      <div className="py-4 px-4 shrink-0 space-y-3 border-b border-white/20 pb-4">
        <h2 className="text-[0.6rem] text-left uppercase tracking-[0.22em] text-white/55">
          Topic Navigator
        </h2>

        {roadmaps.length > 0 && (
          <div className="relative">
            <select 
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-8 text-xs text-white appearance-none focus:outline-none focus:border-blue-500/50 cursor-pointer"
              value={currentRoadmapId}
              onChange={(e) => {
                const id = e.target.value;
                const params = new URLSearchParams(searchParams?.toString() || "");
                if (id) {
                  params.set("roadmap_id", id);
                  params.set("source", "personal");
                  // Clear active topic/subject to let the workspace reload the new roadmap's first topic
                  params.delete("topic");
                  params.delete("subject");
                } else {
                  params.delete("roadmap_id");
                  params.set("source", "courses");
                  params.delete("topic");
                  params.delete("subject");
                }
                router.push(`/learning?${params.toString()}`);
              }}
            >
              <option value="" className="bg-slate-900">All Topics (No Roadmap)</option>
              {roadmaps.map(rm => (
                <option key={rm.id} value={rm.id.toString()} className="bg-slate-900">{rm.title}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-white/50" />
            </div>
          </div>
        )}

      </div>

      <div className="flex-1 overflow-y-auto purple-scrollbar px-2">
        {data?.sidebarData
          ?.filter((category: any) => {
            if (source === "personal") {
              return category.id === "roadmap" || category.id === "documents";
            } else {
              return category.id === "curriculum" || category.id === "current" || category.id === "history" || category.id === "class";
            }
          })
          .map((category: any) => (
          <CategorySection
            key={category.id}
            category={category}
            expanded={expandedCategories[category.id] || false}
            expandedSubjects={expandedSubjects}
            selectedTopicId={selectedTopicId}
            onSelectTopic={(id, subjectId) => {
              setSelectedTopicId(id);
              onSelectTopic(id, subjectId);
            }}
            onToggleCategory={toggleCategory}
            onToggleSubject={toggleSubject}
          />
        ))}
      </div>
    </div>
  );
});

export default LearningSidebar;