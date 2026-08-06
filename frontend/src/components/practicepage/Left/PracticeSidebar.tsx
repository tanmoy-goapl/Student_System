'use client'

import { useState, useEffect, useCallback } from "react";
import TopicSelectorSection from "./TopicSelectorSection";
import SessionSettingsSection from "./SessionSettingsSection";
import AddGeneralTopicModal from "./AddGeneralTopicModal";
import { getPracticeData, PracticeDataResponse } from "@/lib/api";
import { Plus } from "lucide-react";

import { useSearchParams } from "next/navigation";

interface PracticeSidebarProps {
  onStartSession?: (mode: string, topic?: string, difficulty?: string, questionCount?: number) => void;
}

export default function PracticeSidebar({ onStartSession }: PracticeSidebarProps) {
  const searchParams = useSearchParams();
  const topicParam = searchParams?.get("topic");
  const source = searchParams?.get("source") || "courses";

  const [data, setData] = useState<PracticeDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [selectedTopic, setSelectedTopic] = useState<string>(topicParam || "");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("easy");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (topicParam) {
      setSelectedTopic(topicParam);
    }
  }, [topicParam]);

  // Get student ID from localStorage
  const getStudentId = (): number | undefined => {
    if (typeof window !== "undefined") {
      const id = localStorage.getItem("user_id");
      return id ? parseInt(id, 10) : undefined;
    }
    return undefined;
  };

  const loadPracticeData = useCallback(async () => {
    try {
      setIsLoading(true);
      const studentId = getStudentId();
      const response = await getPracticeData(studentId);
      setData(response);

      // Auto-expand only document subjects and select first topic if none is selected
      if (response.subjects && response.subjects.length > 0) {
        setExpandedSubjects((prev) => {
          const docExpanded: Record<string, boolean> = {};
          response.subjects.forEach((subj) => {
            const activeTopic = topicParam || (response.subjects && response.subjects.length > 0 && (response.subjects[0].topics?.[0] || response.subjects[0].weakAreas?.[0])) || "";
            const hasSelectedTopic = subj.topics?.includes(activeTopic) || subj.weakAreas?.includes(activeTopic);
            if (hasSelectedTopic || subj.isExpanded) {
              docExpanded[subj.id] = true;
            }
          });
          return {
            ...docExpanded,
            ...prev
          };
        });

        setSelectedTopic((prev) => {
          if (!prev) {
            const firstTopics = response.subjects[0].topics || response.subjects[0].weakAreas;
            if (firstTopics && firstTopics.length > 0) {
              return firstTopics[0];
            }
          }
          return prev;
        });
      }
    } catch (error) {
      // Failed to load — will show empty state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPracticeData();
  }, [loadPracticeData]);

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
  };

  const handleStartPractice = () => {
    if (onStartSession) {
      onStartSession("topic", selectedTopic || undefined, selectedDifficulty, questionCount);
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

  // Filter subjects based on source
  const filteredSubjects = data?.subjects?.filter((subj) => {
    if (source === "personal") return subj.section === "documents" || subj.section === "roadmap";
    return subj.section === "curriculum";
  }) || [];

  const hasSubjects = filteredSubjects.length > 0;

  return (
    <div className="bg-[#131826] w-[20vw] h-screen flex flex-col text-white">
      <div className="flex-1 overflow-y-auto purple-scrollbar">
        {/* Topic Selector Section */}
        {hasSubjects ? (
          <TopicSelectorSection
            subjects={filteredSubjects}
            expandedSubjects={expandedSubjects}
            selectedTopic={selectedTopic}
            onSelectTopic={(topic) => {
              setSelectedTopic(topic);
            }}
            onToggleSubject={toggleSubject}
            onAddTopicClick={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Topics
              </h3>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md animate-pulse"
                title="Add General Topic"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
              <p className="text-xs text-slate-400 leading-relaxed">
                📄 Upload study documents or click the <span className="font-semibold text-white">+</span> button above to choose general topics to practice.
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
            className="w-full py-3 bg-[#5B5FFF] hover:bg-[#4c4fdb] text-white rounded-xl font-semibold text-sm 
                       transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]
                       shadow-lg shadow-indigo-500/20 border border-[#7276ff]/20"
          >
            Start Practice
          </button>
        </div>
      </div>

      {/* Add Topic Modal */}
      <AddGeneralTopicModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadPracticeData}
      />
    </div>
  );
}