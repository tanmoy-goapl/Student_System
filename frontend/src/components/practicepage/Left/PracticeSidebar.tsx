'use client'

import { useState, useEffect } from "react";
import PracticeModeSection from "./PracticeModeSection";
import TopicSelectorSection from "./TopicSelectorSection";
import SessionSettingsSection from "./SessionSettingsSection";
import SessionInfoSection from "./SessionInfoSection";
import { getPracticeData, PracticeDataResponse } from "@/lib/api";

interface PracticeSidebarProps {
  onStartSession?: (mode: string, topic?: string, difficulty?: string, questionCount?: number) => void;
}

export default function PracticeSidebar({ onStartSession }: PracticeSidebarProps) {
  const [data, setData] = useState<PracticeDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMode, setSelectedMode] = useState<string>("topic");
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("mixed");
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Get student ID from localStorage
  const getStudentId = (): number | undefined => {
    if (typeof window !== "undefined") {
      const id = localStorage.getItem("user_id");
      return id ? parseInt(id, 10) : undefined;
    }
    return undefined;
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const studentId = getStudentId();
        const response = await getPracticeData(studentId);
        setData(response);

        // Auto-expand first subject and select first topic
        if (response.subjects && response.subjects.length > 0) {
          setExpandedSubjects({ [response.subjects[0].id]: true });
          const firstTopics = response.subjects[0].topics || response.subjects[0].weakAreas;
          if (firstTopics && firstTopics.length > 0) {
            setSelectedTopic(firstTopics[0]);
          }
        }
      } catch (error) {
        // Failed to load — will show empty state
      } finally {
        setIsLoading(false);
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

  const handleStartPractice = () => {
    if (onStartSession) {
      onStartSession(selectedMode, selectedTopic || undefined, selectedDifficulty, questionCount);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#131826] w-[20vw] h-screen flex flex-col text-white p-4 space-y-4 animate-pulse">
        <div className="h-24 bg-slate-800 rounded-xl"></div>
        <div className="h-64 bg-slate-800 rounded-xl"></div>
      </div>
    );
  }

  // No documents uploaded — show guidance
  const hasSubjects = data && data.subjects && data.subjects.length > 0;

  return (
    <div className="bg-[#131826] w-[20vw] h-screen flex flex-col text-white">
      <div className="flex-1 overflow-y-auto purple-scrollbar">
        {/* Practice Mode Section */}
        <PracticeModeSection
          modes={data?.practiceModes || []}
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
        />

        {/* Topic Selector Section */}
        {hasSubjects ? (
          <TopicSelectorSection
            subjects={data!.subjects}
            expandedSubjects={expandedSubjects}
            selectedTopic={selectedTopic}
            onSelectTopic={(topic) => {
              setSelectedTopic(topic);
              setSelectedMode("topic");
            }}
            onToggleSubject={toggleSubject}
          />
        ) : (
          <div className="p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Topics
            </h3>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
              <p className="text-xs text-slate-400 leading-relaxed">
                📄 Upload study documents to auto-extract topics for practice.
                The AI will analyze your materials and create personalized quizzes.
              </p>
            </div>
          </div>
        )}

        {/* Session Settings Section */}
        <SessionSettingsSection
          difficulties={data?.difficulties || []}
          selectedDifficulty={selectedDifficulty}
          onSelectDifficulty={setSelectedDifficulty}
          questionCount={questionCount}
          onQuestionCountChange={setQuestionCount}
        />

        {/* Start Button */}
        <div className="p-4">
          <button
            onClick={handleStartPractice}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-xl font-medium text-sm 
                       hover:opacity-90 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
                       shadow-lg shadow-violet-500/20"
          >
            Start Practice
          </button>
        </div>

        {/* Session Info Section */}
        {data?.sessionStats && (
          <SessionInfoSection stats={data.sessionStats} />
        )}
      </div>
    </div>
  );
}