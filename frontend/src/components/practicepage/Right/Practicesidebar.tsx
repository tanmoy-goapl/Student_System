import AIBehavioralInsights from "./AIBehavioralInsights";
import WeakTopics from "./WeakTopics";
import AdaptiveEngine from "./AdaptiveEngine";

interface PracticeSidebarProps {
  // Dynamic data from API
  weakTopics?: {
    topic: string;
    subject: string;
    accuracy: number;
    reason?: string;
  }[];
  insights?: {
    type: string;
    title: string;
    description: string;
    frequency: number;
  }[];
  adaptiveEngine?: any;
  suggestedNext?: any[];
  performanceLoading?: boolean;
  answeredQuestions?: number;
  overallAccuracy?: number;

  // Callbacks
  onContinuePractice?: () => void;
  onReviewMistakes?: () => void;
  onGoToLearning?: () => void;
}

export default function PracticeSidebar({
  weakTopics,
  insights,
  adaptiveEngine,
  suggestedNext = [],
  performanceLoading = false,
  answeredQuestions = 0,
  overallAccuracy = 0,
  onContinuePractice,
  onReviewMistakes,
  onGoToLearning,
}: PracticeSidebarProps) {
  return (
    <div className="w-full h-full bg-[#090D1F] flex flex-col border-l border-white/10 overflow-hidden">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
        <AIBehavioralInsights
          insights={insights}
          loading={performanceLoading}
          answeredQuestions={answeredQuestions}
          overallAccuracy={overallAccuracy}
        />

        <WeakTopics topics={weakTopics} />

        <AdaptiveEngine config={adaptiveEngine} />
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 3px;
          transition: background 0.2s;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  );
}