import { Question } from "@/constants/practicepage-data";

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
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
          <span className="text-base">?</span>
        </div>

        {/* Question Text */}
        <div className="flex-1">
          <p className="text-base text-white leading-relaxed">
            {question.questionText}
          </p>
        </div>
      </div>
    </div>
  );
}