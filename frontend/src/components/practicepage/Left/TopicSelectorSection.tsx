import { Subject } from "@/constants/practicepage-data";
import SubjectAccordion from "./SubjectAccordion";

interface TopicSelectorSectionProps {
  subjects: Subject[];

  expandedSubjects: Record<string, boolean>;

  selectedTopic: string;

  onSelectTopic: (topic: string) => void;

  onToggleSubject: (
    subjectId: string
  ) => void;
}

export default function TopicSelectorSection({
  subjects,
  expandedSubjects,
  selectedTopic,
  onSelectTopic,
  onToggleSubject,
}: TopicSelectorSectionProps) {
  return (
    <div className="px-4 py-4 border-b border-white/10">
      <h3 className="text-xs text-white/40 mb-3">
        Topic Selector
      </h3>

      <div className="space-y-1">
        {subjects.map((subject) => (
          <SubjectAccordion
            key={subject.id}
            subject={subject}
            isExpanded={
              expandedSubjects[subject.id] ||
              false
            }
            selectedTopic={selectedTopic}
            onSelectTopic={onSelectTopic}
            onToggle={() =>
              onToggleSubject(subject.id)
            }
          />
        ))}
      </div>
    </div>
  );
}