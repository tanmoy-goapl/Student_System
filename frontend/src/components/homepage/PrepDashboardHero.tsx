import { EXAM_OVERVIEW_STATS, MENTOR_AI_CARD } from '../../constants/homepage-data';
import IndividualPrepCard from './IndividualPrepCard';

export type IndividualPrepCardProps = {
  stat: {
    id: string;
    title: string;
    value: string;
    subtitle: string;
    icon: React.ElementType;
    iconClassName?: string;
  };
};

function MentorAICard() {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-[#111133] via-[#0c1029] to-[#090b1f] p-6">
      {/* glow */}
      <div className="absolute right-5 top-5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_4px_rgba(74,222,128,0.7)]" />

      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
            <img
              src={MENTOR_AI_CARD.logo}
              alt="Mentor AI"
              className="h-5 w-5 object-contain"
            />
          </div>

          <p className="text-sm font-medium text-white">
            {MENTOR_AI_CARD.title}
          </p>
        </div>

        <p className="max-w-2xl text-xs text-white/75">
          You need to focus on{' '}
          <span className="font-semibold text-rose-400">
            Wave Optics
          </span>{' '}
          and{' '}
          <span className="font-semibold text-amber-300">
            Calculus
          </span>{' '}
          today. These are your two most critical weak areas before the exam.
        </p>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
          {MENTOR_AI_CARD.primaryAction}
        </button>

        <button className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-white/70 transition hover:bg-white/[0.05]">
          {MENTOR_AI_CARD.secondaryAction}
        </button>
      </div>
    </div>
  );
}

export default function PrepDashboardHero() {
  return (
    <div className="grid grid-cols-10 gap-4 rounded-3xl border border-violet-500/10 bg-[#090B1A] p-2">
      {/* Left Section - 60% */}
      <div className="col-span-6 grid grid-cols-3 gap-4">
        {EXAM_OVERVIEW_STATS.map((stat) => (
          <IndividualPrepCard key={stat.id} stat={stat} />
        ))}
      </div>

      {/* Right Section - 40% */}
      <div className="col-span-4">
        <MentorAICard />
      </div>
    </div>
  );
}