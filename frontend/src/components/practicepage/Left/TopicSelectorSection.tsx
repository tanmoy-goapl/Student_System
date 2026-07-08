import { Subject } from "@/constants/practicepage-data";
import SubjectAccordion from "./SubjectAccordion";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface TopicSelectorSectionProps {
  subjects: Subject[];

  expandedSubjects: Record<string, boolean>;

  selectedTopic: string;

  onSelectTopic: (topic: string) => void;

  onToggleSubject: (
    subjectId: string
  ) => void;

  onAddTopicClick: () => void;
}

export default function TopicSelectorSection({
  subjects,
  expandedSubjects,
  selectedTopic,
  onSelectTopic,
  onToggleSubject,
  onAddTopicClick,
}: TopicSelectorSectionProps) {
  const documentSubjects = subjects.filter((s) => s.section === "documents");
  const curriculumSubjects = subjects.filter(
    (s) => s.section === "curriculum" || !s.section
  );
  const roadmapSubjects = subjects.filter((s) => s.section === "roadmap");

  const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({});

  useState(() => {
    // Hook to auto-expand semesters when component mounts
    const initial: Record<string, boolean> = {};
    subjects.forEach((s) => {
      if (s.semester) {
        initial[s.semester] = true;
      }
    });
    setExpandedSemesters(initial);
  });

  const toggleSemester = (sem: string) => {
    setExpandedSemesters((prev) => ({ ...prev, [sem]: !prev[sem] }));
  };

  const groupedCurriculum = curriculumSubjects.reduce((acc, subj) => {
    const sem = subj.semester || "Other Topics";
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(subj);
    return acc;
  }, {} as Record<string, Subject[]>);

  return (
    <div className="px-4 py-4 border-b border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-white/40 uppercase tracking-wider font-semibold">
          Topic Selector
        </h3>
        <button
          onClick={onAddTopicClick}
          className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md"
          title="Add General Topic"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="space-y-4">
        {roadmapSubjects.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-amber-400/95 mb-2 px-1 tracking-wide uppercase">
              Your Personalized Roadmap
            </h4>
            <div className="space-y-1">
              {roadmapSubjects.map((subject) => (
                <SubjectAccordion
                  key={subject.id}
                  subject={subject}
                  isExpanded={expandedSubjects[subject.id] || false}
                  selectedTopic={selectedTopic}
                  onSelectTopic={onSelectTopic}
                  onToggle={() => onToggleSubject(subject.id)}
                />
              ))}
            </div>
          </div>
        )}

        {documentSubjects.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-violet-400/95 mb-2 px-1 tracking-wide uppercase">
              Your Uploaded Document Topics
            </h4>
            <div className="space-y-1">
              {documentSubjects.map((subject) => (
                <SubjectAccordion
                  key={subject.id}
                  subject={subject}
                  isExpanded={expandedSubjects[subject.id] || false}
                  selectedTopic={selectedTopic}
                  onSelectTopic={onSelectTopic}
                  onToggle={() => onToggleSubject(subject.id)}
                />
              ))}
            </div>
          </div>
        )}

        {curriculumSubjects.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-blue-400/95 mb-2 px-1 tracking-wide uppercase">
              Your Course Curriculum
            </h4>
            <div className="space-y-2">
              {Object.entries(groupedCurriculum).map(([semesterName, semSubjects]) => (
                <div key={semesterName} className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.02]">
                  <button
                    onClick={() => toggleSemester(semesterName)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-300/90">{semesterName}</span>
                    </div>
                    {expandedSemesters[semesterName] ? (
                      <ChevronDown size={14} className="text-white/40" />
                    ) : (
                      <ChevronRight size={14} className="text-white/40" />
                    )}
                  </button>
                  {expandedSemesters[semesterName] && (
                    <div className="p-1.5 space-y-1 bg-black/10">
                      {semSubjects.map((subject) => (
                        <SubjectAccordion
                          key={subject.id}
                          subject={subject}
                          isExpanded={expandedSubjects[subject.id] || false}
                          selectedTopic={selectedTopic}
                          onSelectTopic={onSelectTopic}
                          onToggle={() => onToggleSubject(subject.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}