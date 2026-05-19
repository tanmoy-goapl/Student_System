import { TopicItem as TopicType } from "@/constants/learningpage-data";

interface TopicItemProps {
  topic: TopicType;
  topicId: string;
  selected: boolean;
  onSelect: (id: string) => void;
  subjectColor: string;
}

export default function TopicItem({
  topic,
  topicId,
  selected,
  onSelect,
  subjectColor,
}: TopicItemProps) {
  return (
    <button
      onClick={() => onSelect(topicId)}
      className={`
        w-[90%] ml-4 mt-1
        flex items-center justify-between
        gap-2
        px-3 py-2
        rounded-lg
        transition-all duration-200
        ${
          selected
            ? "bg-[#5b5fff] text-white"
            : "hover:bg-[#111] text-white/80"
        }
      `}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: subjectColor,
          }}
        />

        <span className="text-[0.6rem] text-left">
          {topic.title}
        </span>
      </div>
    </button>
  );
}