import { SubjectItem } from "@/constants/learningpage-data";
import { ChevronDown, ChevronRight } from "lucide-react";
import TopicItem from "./TopicItem";

interface SubjectSectionProps {
  categoryId: string;
  subject: SubjectItem;
  expanded: boolean;
  selectedTopicId: string;
  onSelectTopic: (id: string) => void;
  onToggle: (id: string) => void;
}

export default function SubjectSection({
  categoryId,
  subject,
  expanded,
  selectedTopicId,
  onSelectTopic,
  onToggle,
}: SubjectSectionProps) {
  return (
    <div className="ml-2 mb-1">
      <button
        onClick={() =>
          subject.topics?.length &&
          onToggle(subject.id)
        }
        className="
          w-full flex items-center justify-between
          px-2.5 py-2 rounded-lg
          hover:bg-[#111]
          transition-all duration-200
        "
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: subject.color,
            }}
          />

          <span className="text-[0.65rem] font-medium">
            {subject.title}
          </span>
        </div>

        {subject.topics?.length ? (
          expanded ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )
        ) : null}
      </button>

      <div
        className={`
          overflow-hidden transition-all duration-300
          ${
            expanded
              ? "max-h-[400px] opacity-100"
              : "max-h-0 opacity-0"
          }
        `}
      >
        {subject.topics?.map((topic) => {
          const topicKey = topic.id;

          return (
            <TopicItem
              key={`${categoryId}-${subject.id}-${topic.id}`}
              topic={topic}
              topicId={topicKey}
              selected={
                selectedTopicId === topicKey
              }
              onSelect={onSelectTopic}
              subjectColor={subject.color}
            />
          );
        })}
      </div>
    </div>
  );
}