import { useState, useEffect } from "react";
import PracticeModeSection from "./PracticeModeSection";
import TopicSelectorSection from "./TopicSelectorSection";
import SessionSettingsSection from "./SessionSettingsSection";
import SessionInfoSection from "./SessionInfoSection";
import { getPracticeData, PracticeDataResponse } from "@/lib/api";

export default function PracticeSidebar() {
  const [data, setData] = useState<PracticeDataResponse | null>(null);

  const [selectedMode, setSelectedMode] =
    useState<string>("weakness");
  const [expandedSubjects, setExpandedSubjects] =
    useState<Record<string, boolean>>({
      physics: true,
    });
  const [selectedTopic, setSelectedTopic] =
    useState<string>('Wave Optics');
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<string>("mixed");
  const [questionCount, setQuestionCount] =
    useState<number>(20);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await getPracticeData();
        setData(response);
      } catch (error) {
        console.error("Failed to fetch practice data:", error);
      }
    }
    fetchData();
  }, []);

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
  };

  if (!data) {
    return (
      <div className="bg-[#131826] w-[20vw] h-screen flex flex-col text-white p-4 space-y-4 animate-pulse">
        <div className="h-24 bg-slate-800 rounded-xl"></div>
        <div className="h-64 bg-slate-800 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#131826] w-[20vw] h-screen flex flex-col text-white">
      <div className="flex-1 overflow-y-auto purple-scrollbar">
        {/* Practice Mode Section */}
        <PracticeModeSection
          modes={data.practiceModes}
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
        />

        {/* Topic Selector Section */}
        <TopicSelectorSection
          subjects={data.subjects}
          expandedSubjects={expandedSubjects}
          selectedTopic={selectedTopic}
          onSelectTopic={setSelectedTopic}
          onToggleSubject={toggleSubject}
        />

        {/* Session Settings Section */}
        <SessionSettingsSection
          difficulties={data.difficulties}
          selectedDifficulty={selectedDifficulty}
          onSelectDifficulty={setSelectedDifficulty}
          questionCount={questionCount}
          onQuestionCountChange={setQuestionCount}
        />

        {/* Session Info Section */}
        <SessionInfoSection stats={data.sessionStats} />
      </div>
    </div>
  );
}