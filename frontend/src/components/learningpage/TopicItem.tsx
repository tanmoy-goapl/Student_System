import { useState, useEffect } from "react";
import { TopicItem as TopicType } from "@/constants/learningpage-data";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";

interface TopicItemProps {
  topic: TopicType;
  topicId: string;
  selectedTopicId: string;
  onSelect: (id: string) => void;
  subjectColor: string;
}

export default function TopicItem({
  topic,
  topicId,
  selectedTopicId,
  onSelect,
  subjectColor,
}: TopicItemProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (topic.subtopics?.includes(selectedTopicId)) {
      setExpanded(true);
    }
  }, [selectedTopicId]);

  const handleClick = () => {
    if (topic.locked) return;
    if (topic.subtopics && topic.subtopics.length > 0) {
      setExpanded(!expanded);
    } else {
      onSelect(topicId);
    }
  };

  const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;

  return (
    <div className="w-[90%] ml-4 mt-1">
      <button
        onClick={handleClick}
        disabled={topic.locked}
        className={`
          w-full flex items-center justify-between
          gap-2
          px-3 py-2
          rounded-lg
          transition-all duration-200
          ${topic.locked ? "opacity-50 cursor-not-allowed grayscale" : ""}
          ${
            (selectedTopicId === topicId) && !topic.locked && !hasSubtopics
              ? "bg-[#5b5fff] text-white"
              : "hover:bg-[#111] text-white/80"
          }
        `}
      >
        <div className="flex items-start gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full mt-[0.35rem] shrink-0"
            style={{
              background: subjectColor,
            }}
          />

          <span className="text-[0.6rem] text-left whitespace-normal leading-tight">
            {topic.title?.replace(/\*\*/g, "")}
          </span>
        </div>

        {topic.locked ? (
          <Lock size={12} className="text-white/40 shrink-0" />
        ) : topic.subtopics && topic.subtopics.length > 0 ? (
          expanded ? (
            <ChevronDown size={14} className="shrink-0" />
          ) : (
            <ChevronRight size={14} className="shrink-0" />
          )
        ) : null}
      </button>

      {/* Subtopics Accordion */}
      {!topic.locked && topic.subtopics && topic.subtopics.length > 0 && (
        <div
          className={`
            overflow-hidden transition-all duration-300 pl-6
            ${expanded ? "max-h-[1000px] opacity-100 py-1" : "max-h-0 opacity-0"}
          `}
        >
          {topic.subtopics.map((subtopic, idx) => {
            const isSubSelected = selectedTopicId === subtopic;
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(subtopic);
                }}
                className={`flex w-full items-center gap-2 py-1.5 px-2 rounded-md transition-colors text-left ${
                  isSubSelected ? "bg-[#5b5fff] text-white" : "hover:bg-white/5"
                }`}
              >
                <div className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                <span className={`text-[0.55rem] whitespace-normal leading-tight transition-colors ${
                  isSubSelected ? "text-white font-medium" : "text-white/60 group-hover:text-white"
                }`}>
                  {subtopic?.replace(/\*\*/g, "")}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}