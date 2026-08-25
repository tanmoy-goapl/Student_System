import { Question } from "@/constants/practicepage-data";
import ProgressIndicator from "./ProgressIndicator";
import SessionProgress from "./SessionProgress";

interface QuestionHeaderProps {
  question: Question;
}

export default function QuestionHeader({
  question,
}: QuestionHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
      {/* Top Row: Number and Badges */}
      <div className="min-w-0 flex flex-wrap items-end justify-between gap-3 mb-2">
        <div className="space-y-2">
          {/* Question Number */}
          <ProgressIndicator
            currentQuestion={question.number}
            totalQuestions={question.totalQuestions}
          />

          {/* Badge Group */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {question.category && question.category.toLowerCase().replace(/[^a-z0-9]/g, '') !== question.topic.toLowerCase().replace(/[^a-z0-9]/g, '') && (
              <span className="px-2 py-1 bg-[#5B5FFF]/10 border border-[#5B5FFF]/30 rounded-lg text-[0.65rem] font-semibold text-[#8F93FF]">
                {question.category}
              </span>
            )}
            <span className="max-w-full break-words px-2 py-1 bg-slate-700/40 border border-slate-600/40 rounded-lg text-[0.65rem] font-medium text-slate-300">
              {question.topic}
            </span>
            <span className="shrink-0 px-2 py-1 bg-red-500/20 border border-red-500/40 rounded-lg text-[0.65rem] font-semibold text-red-300">
              {question.difficulty}
            </span>
          </div>
        </div>

        {/* Session Progress Dots */}
        <SessionProgress
          currentQuestion={question.number}
          totalQuestions={question.totalQuestions}
          progressColor={question.progressColor}
        />
      </div>

      {/* Meta Info */}
      <p className="text-[0.65rem] text-slate-400 break-words">
        {question.mode} • {question.description}
      </p>
    </div>
  );
}