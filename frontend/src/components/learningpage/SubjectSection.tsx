import { SubjectItem } from "@/constants/learningpage-data";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import TopicItem from "./TopicItem";

interface SubjectSectionProps {
  categoryId: string;
  subject: SubjectItem;
  expanded: boolean;
  selectedTopicId: string;
  onSelectTopic: (id: string, subjectId?: string) => void;
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
  const isActive = subject.topics?.some(
    (topic) =>
      topic.id === selectedTopicId ||
      topic.subtopics?.includes(selectedTopicId)
  );

  return (
    <div className="ml-2 mb-1">
      <button
        onClick={() =>
          subject.topics?.length &&
          onToggle(subject.id)
        }
        className={`
          w-full flex items-center justify-between
          px-2.5 py-2 rounded-lg
          transition-all duration-200
          ${isActive ? "bg-white/[0.06]" : "hover:bg-[#111]"}
        `}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: subject.color,
            }}
          />

          <span className="text-[0.65rem] font-medium flex items-center gap-1.5">
            {subject.title}
            {subject.locked && <Lock size={12} className="text-zinc-500" />}
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
              ? "max-h-[3000px] opacity-100"
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
              selectedTopicId={selectedTopicId}
              onSelect={(id) => {
                const actualSubjectId = categoryId === "curriculum" ? topic.id : subject.id;
                onSelectTopic(id, actualSubjectId);
              }}
              subjectColor={subject.color}
            />
          );
        })}
      </div>
    </div>
  );
}