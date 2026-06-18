import { Subject } from "@/constants/practicepage-data";
import SubjectAccordion from "./SubjectAccordion";
import { Plus } from "lucide-react";

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

        <div>
          <h4 className="text-xs font-bold text-blue-400/95 mb-2 px-1 tracking-wide uppercase">
            Your Course Curriculum
          </h4>
          <div className="space-y-1">
            {curriculumSubjects.map((subject) => (
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
      </div>
    </div>
  );
}