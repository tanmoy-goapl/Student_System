import { Question } from "@/constants/practicepage-data";

import { HelpCircle } from "lucide-react";

interface QuestionContentProps {
  question: Question;
}

export default function QuestionContent({
  question,
  }: QuestionContentProps) {
  return (
    <div className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-start gap-4">
        {/* Question Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#5B5FFF]/10 border border-[#5B5FFF]/35 text-[#8F93FF] flex items-center justify-center shadow-lg shadow-[#5B5FFF]/5">
          <HelpCircle className="w-6 h-6 animate-pulse" />
        </div>

        {/* Question Text */}
        <div className="min-w-0 flex-1">
          <p className="text-base text-white leading-relaxed break-words whitespace-pre-wrap">
            {question.questionText}
          </p>
        </div>
      </div>
    </div>
  );
}