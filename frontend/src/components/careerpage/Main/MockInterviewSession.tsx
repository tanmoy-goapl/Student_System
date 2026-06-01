import { Play, ArrowRight } from 'lucide-react';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export type InterviewQuestion = {
  id: string;
  number: number;
  title: string;
  category: string;
  difficulty: DifficultyLevel;
};

type QuestionCardProps = {
  question: InterviewQuestion;
  onStart: (questionId: string) => void;
};

function QuestionCard({ question, onStart }: QuestionCardProps) {
  const difficultyConfig = {
    Easy: {
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15',
      borderColor: 'border-emerald-500/30',
    },
    Medium: {
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/15',
      borderColor: 'border-amber-500/30',
    },
    Hard: {
      textColor: 'text-red-400',
      bgColor: 'bg-red-500/15',
      borderColor: 'border-red-500/30',
    },
  };

  const config = difficultyConfig[question.difficulty];

  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.05]">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 flex-shrink-0 text-sm font-medium text-white/70">
          {question.number}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white leading-snug">
            {question.title}
          </h3>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex text-xs px-2.5 py-1 rounded-lg bg-white/5 text-white/70 border border-white/10">
              {question.category}
            </span>
            <span
              className={`inline-flex text-xs px-2.5 py-1 rounded-lg font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}
            >
              {question.difficulty}
            </span>
          </div>
        </div>

        <button
          onClick={() => onStart(question.id)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 hover:bg-white/5 flex-shrink-0 transition"
          aria-label={`Start ${question.title}`}
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

type MockInterviewSessionProps = {
  questions: InterviewQuestion[];
  onStartInterview: () => void;
  onStartQuestion: (questionId: string) => void;
};

export default function MockInterviewSession({
  questions,
  onStartInterview,
  onStartQuestion,
}: MockInterviewSessionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Mock Interview Session</h2>
          <p className="text-xs text-white/55 mt-1">
            AI-powered · Real-time feedback · Recorded
          </p>
        </div>
        <button
          onClick={onStartInterview}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium transition"
        >
          <Play className="h-4 w-4" />
          Start Mock Interview
        </button>
      </div>

      <div className="space-y-3">
        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            onStart={onStartQuestion}
          />
        ))}
      </div>
    </section>
  );
}