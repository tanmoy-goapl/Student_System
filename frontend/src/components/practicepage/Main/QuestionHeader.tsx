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
    <div className="bg-[#0e1330]/60 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
      {/* Subtle top glowing line */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left Side: Circular Progress Indicator */}
        <div className="flex-shrink-0">
          <ProgressIndicator
            currentQuestion={question.number}
            totalQuestions={question.totalQuestions}
          />
        </div>

        {/* Center: Main Topic Header & Description */}
        <div className="flex-1 text-center md:text-left min-w-0 space-y-1.5">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight break-words leading-tight">
            {question.topic}
          </h2>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-slate-400">
            {question.category && question.category.toLowerCase().replace(/[^a-z0-9]/g, '') !== question.topic.toLowerCase().replace(/[^a-z0-9]/g, '') && (
              <span className="px-2 py-0.5 bg-[#5B5FFF]/15 border border-[#5B5FFF]/35 rounded-md text-[0.6rem] font-bold text-[#8F93FF] uppercase tracking-wider">
                {question.category}
              </span>
            )}
            <span className="px-2 py-0.5 bg-red-500/15 border border-red-500/35 rounded-md text-[0.6rem] font-bold text-red-300 uppercase tracking-wider">
              {question.difficulty}
            </span>
            <span className="hidden md:inline text-slate-600">•</span>
            <span>{question.mode}</span>
            <span className="hidden md:inline text-slate-600">•</span>
            <span className="text-slate-400">{question.description}</span>
          </div>
        </div>

        {/* Right Side: Session Progress Dots */}
        <div className="flex-shrink-0">
          <SessionProgress
            currentQuestion={question.number}
            totalQuestions={question.totalQuestions}
            progressColor={question.progressColor}
          />
        </div>
      </div>
    </div>
  );
}