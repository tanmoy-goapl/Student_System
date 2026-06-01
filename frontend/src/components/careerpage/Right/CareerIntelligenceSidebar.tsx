import SkillGapAnalysis from './SkillGapAnalysis';
import MarketInsights from './MarketInsights';
import AIRecommendations from './AIRecommendations';
import PlacementReadiness from './PlacementReadiness';
import ProgressTracking from './ProgressTracking';
import {
  SKILL_GAP_DATA,
  MARKET_INSIGHTS_DATA,
  AI_RECOMMENDATIONS_DATA,
  PLACEMENT_READINESS_DATA,
  PROGRESS_TRACKING_DATA,
} from '@/constants/careerpage-data';

export default function CareerIntelligenceSidebar() {
  return (
    <aside className="w-[20vw] min-w-[260px] flex flex-col gap-4 overflow-y-auto">
      <div className="rounded-2xl border border-violet-500/15 bg-[#090B1A] p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <svg className="h-4 w-4 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" /><path d="m7 16 4-4 4 4 5-5" />
          </svg>
          <h1 className="text-xs font-semibold tracking-[0.18em] uppercase text-white/80">
            Career Intelligence
          </h1>
        </div>

        <SkillGapAnalysis skills={SKILL_GAP_DATA} />
        <MarketInsights data={MARKET_INSIGHTS_DATA} />
        <AIRecommendations recommendations={AI_RECOMMENDATIONS_DATA} />
        <PlacementReadiness data={PLACEMENT_READINESS_DATA} />
        <ProgressTracking items={PROGRESS_TRACKING_DATA} />
      </div>
    </aside>
  );
}