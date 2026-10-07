import { CheckCircle, Clock, Zap, CheckCircle2, Cpu, Mic } from 'lucide-react';

export type Skill = {
  name: string;
};

export type Phase = {
  id: string;
  title: string;
  skills: Skill[];
  status: 'completed' | 'in-progress' | 'upcoming';
  duration?: string;
  iconName: string;
  icon?: React.ElementType;
};

const iconMap: Record<string, any> = {
  CheckCircle2,
  Zap,
  Cpu,
  Mic
};

type PhaseCardProps = {
  phase: Phase;
  isCurrentPhase?: boolean;
};

function PhaseCard({ phase, isCurrentPhase = false }: PhaseCardProps) {
  const Icon = iconMap[phase.iconName] || CheckCircle2;

  const statusConfig = {
    completed: {
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      bgColor: 'bg-emerald-500/15',
      iconColor: 'text-emerald-400',
    },
    'in-progress': {
      textColor: 'text-blue-400',
      borderColor: 'border-blue-500/30',
      bgColor: 'bg-blue-500/15',
      iconColor: 'text-blue-400',
    },
    upcoming: {
      textColor: 'text-white/50',
      borderColor: 'border-white/10',
      bgColor: 'bg-white/[0.03]',
      iconColor: 'text-white/40',
    },
  };

  const config = statusConfig[phase.status];

  return (
    <div
      className={`group rounded-2xl border transition ${
        isCurrentPhase
          ? `${config.borderColor} ${config.bgColor}`
          : 'border-white/10 bg-white/[0.03]'
      } p-5 hover:border-white/20 hover:bg-white/[0.05]`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 ${
            phase.status === 'completed'
              ? 'bg-emerald-500/20 border border-emerald-500/30'
              : phase.status === 'in-progress'
                ? 'bg-blue-500/20 border border-blue-500/30'
                : 'bg-white/5 border border-white/10'
          }`}
        >
          <Icon className={`h-6 w-6 ${config.iconColor}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{phase.title}</h3>
            {phase.status === 'completed' && (
              <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {phase.skills.map((skill) => (
              <span
                key={skill.name}
                className="inline-flex text-xs px-2.5 py-1 rounded-lg bg-white/5 text-white/70 border border-white/10"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {phase.duration && (
            <span className="text-xs text-white/55 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
              {phase.duration}
            </span>
          )}
          {phase.status === 'in-progress' && (
            <span className={`text-xs font-medium ${config.textColor}`}>
              In Progress
            </span>
          )}
          {phase.status === 'completed' && (
            <span className={`text-xs font-medium ${config.textColor}`}>
              Completed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

type SkillRoadmapProps = {
  title: string;
  duration: string;
  phaseCount: number;
  skillCount: number;
  currentPhase: number;
  phases: Phase[];
};

export default function SkillRoadmap({
  title,
  duration,
  phaseCount,
  skillCount,
  currentPhase,
  phases,
}: SkillRoadmapProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-xs text-white/55 mt-1">
            {duration} · {phaseCount} phases · {skillCount} skills
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/15 text-xs font-medium text-blue-400">
          Phase {currentPhase} of {phaseCount}
        </div>
      </div>

      <div className="space-y-3">
        {phases.map((phase) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            isCurrentPhase={phase.status === 'in-progress'}
          />
        ))}
      </div>
    </section>
  );
}