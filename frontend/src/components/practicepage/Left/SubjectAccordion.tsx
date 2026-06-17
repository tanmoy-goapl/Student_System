import {
  ChevronRight,
  ChevronDown,
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
        className="
          w-full flex items-center justify-between
          px-3 py-2 rounded-lg
          hover:bg-white/[0.08]
          transition-all duration-200
          text-left
        "
      >
        <div className="flex items-center gap-2.5">
          <span
            className="text-xs"
            style={{
              color: subject.color,
            }}
          >
            #
          </span>

          <span className="text-xs font-medium text-white">
            {subject.title}
          </span>
        </div>

        {isExpanded ? (
          <ChevronDown
            size={12}
            className="text-white/40"
          />
        ) : (
          <ChevronRight
            size={12}
            className="text-white/40"
          />
        )}
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
          {(subject.topics || []).map((area) => {
            const isSelected = selectedTopic === area;
            const isWeak = (subject.weakAreas || []).includes(area);

            return (
              <button
                key={area}
                onClick={() => onSelectTopic(area)}
                className={`
                  w-full flex items-center justify-between
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
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: subject.color }}
                  />
                  <span className="text-[0.7rem] text-white">
                    {area}
                  </span>
                </div>

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
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}