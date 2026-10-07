import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";

import { Subject } from "@/constants/practicepage-data";

interface SubjectAccordionProps {
  subject: Subject;

  isExpanded: boolean;

  selectedTopic: string;

  onSelectTopic: (
    topic: string
  ) => void;

  onToggle: () => void;
}

export default function SubjectAccordion({
  subject,
  isExpanded,
  selectedTopic,
  onSelectTopic,
  onToggle,
}: SubjectAccordionProps) {
  return (
    <div>
      {/* Subject Header */}
      <button
        onClick={onToggle}
        title={subject.title}
        className="
          w-full min-w-0 flex items-center justify-between
          px-3 py-2 rounded-lg
          hover:bg-white/[0.08]
          transition-all duration-200
          text-left
        "
      >
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="text-xs"
            style={{
              color: subject.color,
            }}
          >
            #
          </span>

          <span className="min-w-0 truncate text-xs font-medium text-white">
            {subject.title}
          </span>
        </div>

        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-white/40" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-white/40" aria-hidden="true" />
          )}
        </span>
      </button>

      {/* Topics */}
      <div
        className={`
          overflow-hidden transition-all duration-300
          ${
            isExpanded
              ? "max-h-[3000px] opacity-100"
              : "max-h-0 opacity-0"
          }
        `}
      >
        <div className="px-3 pb-2 space-y-1.5">
          {(subject.topics || []).map((area, index) => {
            const isSelected = selectedTopic === area;
            const isWeak = (subject.weakAreas || []).includes(area);
            const isPracticed = (subject.practicedTopics || []).includes(area);

            return (
              <button
                key={`${area}-${index}`}
                onClick={() => onSelectTopic(area)}
                title={area}
                className={`
                  w-full min-w-0 flex items-center justify-between
                  px-3 py-2 rounded-lg
                  transition-all duration-200
                  border text-left
                  ${
                    isSelected
                      ? "bg-[#5B5FFF] border-[#7276ff]"
                      : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06]"
                  }
                `}
              >
                <div className="flex items-center gap-2 max-w-[70%]">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: subject.color }}
                  />
                  <span className="min-w-0 truncate text-[0.7rem] text-white">
                    {area}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {(isSelected || isWeak) && (
                    <span
                      className={`
                        text-[9px]
                        font-semibold
                        px-2 py-1 rounded-md
                        tracking-wider
                        ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-[#ff5c5c] text-white"
                        }
                      `}
                    >
                      {isSelected ? "Active" : "Weak"}
                    </span>
                  )}
                  {isPracticed && (
                    <CheckCircle2 size={13} className={isSelected ? "text-white" : "text-emerald-400"} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}