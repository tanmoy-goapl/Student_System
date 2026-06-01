'use client';

export type SkillGapItem = {
  id: string;
  name: string;
  required: boolean;
  completion: number;
  domain: string;
};

type Props = { skills: SkillGapItem[] };

function getBarColor(completion: number) {
  if (completion >= 80) return 'bg-emerald-500';
  if (completion >= 65) return 'bg-blue-500';
  if (completion >= 45) return 'bg-amber-500';
  return 'bg-red-500';
}

function getPercentColor(completion: number) {
  if (completion >= 80) return 'text-emerald-400';
  if (completion >= 65) return 'text-blue-400';
  if (completion >= 45) return 'text-amber-400';
  return 'text-red-400';
}

export default function SkillGapAnalysis({ skills }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-red-400" />
        <h2 className="text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-white/55">
          Skill Gap Analysis
        </h2>
      </div>

      <div className="space-y-3.5">
        {skills.map((skill) => (
          <div key={skill.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-white truncate">{skill.name}</span>
                {skill.required && (
                  <span className="text-[0.6rem] font-medium px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0">
                    Required
                  </span>
                )}
              </div>
              <span className={`text-xs font-semibold flex-shrink-0 ${getPercentColor(skill.completion)}`}>
                {skill.completion}%
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getBarColor(skill.completion)}`}
                style={{ width: `${skill.completion}%` }}
              />
            </div>

            <p className="text-[0.65rem] text-white/35">
              {skill.domain} · {100 - skill.completion}% gap remaining
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}