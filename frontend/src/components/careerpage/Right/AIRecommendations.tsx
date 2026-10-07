export type AIRecommendation = {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  ctaLabel: string;
  onAction?: () => void;
};

type Props = { recommendations: AIRecommendation[] };

const priorityConfig = {
  HIGH: {
    label: 'High Priority',
    icon: '▲',
    iconColor: 'text-red-400',
    borderColor: 'border-red-500/20',
    bgColor: 'bg-red-500/5',
    labelColor: 'text-red-400',
  },
  MEDIUM: {
    label: 'Medium Priority',
    icon: '▲',
    iconColor: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    bgColor: 'bg-amber-500/5',
    labelColor: 'text-amber-400',
  },
  LOW: {
    label: 'Low Priority',
    icon: '▲',
    iconColor: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    bgColor: 'bg-blue-500/5',
    labelColor: 'text-blue-400',
  },
};

function RecommendationCard({ rec }: { rec: AIRecommendation }) {
  const config = priorityConfig[rec.priority];

  return (
    <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-4 space-y-3`}>
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs ${config.iconColor}`}>{config.icon}</span>
          <p className={`text-[0.65rem] font-semibold tracking-wider uppercase ${config.labelColor}`}>
            {config.label}
          </p>
        </div>
        <h3 className="text-sm font-semibold text-white">{rec.title}</h3>
      </div>

      <p className="text-[0.7rem] leading-relaxed text-white/50">{rec.description}</p>

      <button
        onClick={rec.onAction}
        className="w-full text-xs font-semibold text-white/80 hover:text-white border border-white/10 hover:border-white/25 rounded-lg py-2 transition hover:bg-white/5"
      >
        {rec.ctaLabel}
      </button>
    </div>
  );
}

export default function AIRecommendations({ recommendations }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-blue-400" />
        <h2 className="text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-white/55">
          AI Recommendations
        </h2>
      </div>

      <div className="space-y-2.5">
        {recommendations.map((rec) => (
          <RecommendationCard key={rec.id} rec={rec} />
        ))}
      </div>
    </section>
  );
}