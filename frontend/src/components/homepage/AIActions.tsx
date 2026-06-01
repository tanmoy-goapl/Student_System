import { ArrowRight } from 'lucide-react';
import { AI_ACTIONS, AIAction } from '../../constants/homepage-data';

type AIActionsProps = {
  data: AIAction[];
};

type ActionCardProps = {
  action: {
    id: string;
    title: string;
    subtitle: string;
    action: string;
    icon: React.ElementType;
    iconClassName: string;
    cardClassName: string;
  };
};

function ActionCard({ action }: ActionCardProps) {
  const Icon = action.icon;

  return (
    <div
      className={`group flex flex-col justify-between rounded-2xl cursor-pointer border bg-gradient-to-br p-5 transition duration-300 hover:scale-[1.02] ${action.cardClassName}`}
    >
      <div className="space-y-2">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.iconClassName}`}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">
            {action.title}
          </h3>

          <p className="mt-1 text-xs text-white/55">
            {action.subtitle}
          </p>
        </div>
      </div>

      <button className="flex items-center gap-1 text-sm mt-2 font-medium text-white/80 transition group-hover:gap-2">
        {action.action}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function AIActions({ data }: AIActionsProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.22em] text-white/55">
          AI Actions
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {data.map((action) => (
          <ActionCard key={action.id} action={action} />
        ))}
      </div>
    </section>
  );
}