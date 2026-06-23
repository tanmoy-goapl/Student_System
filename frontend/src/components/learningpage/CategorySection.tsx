import { CategoryItem } from "@/constants/learningpage-data";
import { ChevronDown, ChevronRight } from "lucide-react";
import SubjectSection from "./SubjectSection";

interface CategorySectionProps {
  category: CategoryItem;
  expanded: boolean;
  expandedSubjects: Record<string, boolean>;
  selectedTopicId: string;
  onSelectTopic: (id: string, subjectId?: string) => void;
  onToggleCategory: (id: string) => void;
  onToggleSubject: (id: string) => void;
}

export default function CategorySection({
  category,
  expanded,
  expandedSubjects,
  selectedTopicId,
  onSelectTopic,
  onToggleCategory,
  onToggleSubject,
}: CategorySectionProps) {

  return (
    <div className="mb-2">
      <button
        onClick={() =>
          onToggleCategory(category.id)
        }
        className={`
          w-full flex items-center justify-between
          px-3 py-2 rounded-xl
          transition-all duration-200
          ${
            "hover:bg-[#1a1a1a]"
          }
        `}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-[0.7rem]">
            {category.title}
          </span>
        </div>

        {expanded ? (
          <ChevronDown size={16} />
        ) : (
          <ChevronRight size={16} />
        )}
      </button>

      <div
        className={`
          overflow-hidden transition-all duration-300
          ${
            expanded
              ? "max-h-[5000px] opacity-100 mt-1"
              : "max-h-0 opacity-0"
          }
        `}
      >
        {category.subjects.map((subject) => (
          <SubjectSection
            key={subject.id}
            categoryId={category.id}
            subject={subject}
            expanded={
              expandedSubjects[subject.id]
            }
            selectedTopicId={
              selectedTopicId
            }
            onSelectTopic={
              onSelectTopic
            }
            onToggle={onToggleSubject}
          />
        ))}
      </div>
    </div>
  );
}