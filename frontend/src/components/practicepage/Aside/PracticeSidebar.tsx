import { useState } from "react";
import PracticeModeSection from "./PracticeModeSection";
import TopicSelectorSection from "./TopicSelectorSection";
import SessionSettingsSection from "./SessionSettingsSection";
import SessionInfoSection from "./SessionInfoSection";
import { DIFFICULTIES, PRACTICE_MODES, SESSION_STATS, SUBJECTS } from "@/constants/practicepage-data";


export default function PracticeSidebar() {
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

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
  };

  return (
    <div className="bg-[#131826] w-[20vw] h-screen flex flex-col text-white">
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {/* Practice Mode Section */}
        <PracticeModeSection
          modes={PRACTICE_MODES}
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
        />

        {/* Topic Selector Section */}
        <TopicSelectorSection
          subjects={SUBJECTS}
          expandedSubjects={expandedSubjects}
          selectedTopic={selectedTopic}
          onSelectTopic={setSelectedTopic}
          onToggleSubject={toggleSubject}
        />

        {/* Session Settings Section */}
        <SessionSettingsSection
          difficulties={DIFFICULTIES}
          selectedDifficulty={selectedDifficulty}
          onSelectDifficulty={setSelectedDifficulty}
          questionCount={questionCount}
          onQuestionCountChange={setQuestionCount}
        />

        {/* Session Info Section */}
        <SessionInfoSection stats={SESSION_STATS} />
      </div>
    </div>
  );
}