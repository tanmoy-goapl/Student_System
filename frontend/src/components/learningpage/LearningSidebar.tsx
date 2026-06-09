import { useState, useEffect } from "react";
import CategorySection from "./CategorySection";
import { getLearningData, LearningDataResponse } from "@/lib/api";

export default function LearningSidebar() {
  const [data, setData] = useState<LearningDataResponse | null>(null);
  const [expandedCategories, setExpandedCategories] =
    useState<Record<string, boolean>>({
      physics: true,
    });

  const [expandedSubjects, setExpandedSubjects] =
    useState<Record<string, boolean>>({
      "wave-optics": true,
    });

  // physics-wave-optics-interference
  const [selectedTopicId, setSelectedTopicId] =
    useState<string>(
      "physics-wave-optics-interference"
    );

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await getLearningData();
        setData(response);
      } catch (error) {
        console.error("Failed to load learning data:", error);
      }
    }
    fetchData();
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
    <div className="bg-[#131826] w-[20vw]">
      <div className="py-2 px-2">
        <h2 className="text-[0.6rem] text-left uppercase tracking-[0.22em] px-2 pt-2 text-white/55">
          Topic Navigator
        </h2>
        <div className="p-2 pb-4 flex justify-start border-b border-white/20">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-1">
            <input
              className="flex-1 w-[12vw] bg-transparent text-xs text-white placeholder:text-white/25 focus:outline-none"
              placeholder="Search topics…"
            />
          </div>
        </div>
      </div>

      <div className="h-[84vh] overflow-y-auto purple-scrollbar text-white p-2 scrollbar-thin scrollbar-thumb-white/10">
        {data.sidebarData.map((category: any) => (
          <CategorySection
            key={category.id}
            category={category}
            expanded={expandedCategories[category.id]}
            expandedSubjects={expandedSubjects}
            selectedTopicId={selectedTopicId}
            onSelectTopic={setSelectedTopicId}
            onToggleCategory={toggleCategory}
            onToggleSubject={toggleSubject}
          />
        ))}
      </div>
    </div>
  )
}