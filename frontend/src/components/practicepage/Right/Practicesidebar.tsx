'use client'

import LivePerformance from "./LivePerformance";
import AIBehavioralInsights from "./AIBehavioralInsights";
import WeakTopics from "./WeakTopics";
import AdaptiveEngine from "./AdaptiveEngine";
import SuggestedNext from "./SuggestedNext";

interface PracticeSidebarProps {
  // Live Performance Props
  accuracy?: number;
  avgSpeed?: string;
  streak?: number;
  pointsEarned?: number;

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

  // Callbacks
  onContinuePractice?: () => void;
  onReviewMistakes?: () => void;
  onGoToLearning?: () => void;
}

export default function PracticeSidebar({
  accuracy = 0,
  avgSpeed = "0s",
  streak = 0,
  pointsEarned = 0,
  weakTopics,
  insights,
  adaptiveEngine,
  suggestedNext = [],
  onContinuePractice,
  onReviewMistakes,
  onGoToLearning,
}: PracticeSidebarProps) {
  return (
    <div className="w-[20vw] h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col border-l border-white/10 overflow-hidden">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <LivePerformance
          accuracy={accuracy}
          avgSpeed={avgSpeed}
          streak={streak}
          pointsEarned={pointsEarned}
        />

        <AIBehavioralInsights insights={insights} />

        <WeakTopics topics={weakTopics} />

        <AdaptiveEngine config={adaptiveEngine} />
      </div>

      {/* Sticky Bottom Section */}
      <div className="flex-shrink-0 border-t border-white/10 bg-gradient-to-t from-slate-950 to-transparent">
        <SuggestedNext
          actions={suggestedNext}
        />
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