'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Play, Target, NotebookPen, RefreshCw, LucideIcon } from 'lucide-react';
import { getAIActions, AIActionCardResponse } from '../../lib/api';
import { AI_ACTIONS as FALLBACK_ACTIONS, AIAction } from '../../constants/homepage-data';

// Maps backend iconName strings to actual Lucide icon components
const ICON_MAP: Record<string, LucideIcon> = {
  Play,
  Target,
  NotebookPen,
  RefreshCw,
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

export default function AIActions() {
  const [actions, setActions] = useState<AIAction[]>(FALLBACK_ACTIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchActions() {
      try {
        const studentId = localStorage.getItem("user_id");
        if (!studentId) {
          if (!cancelled) setActions([]);
          return;
        }
        const data: AIActionCardResponse[] = await getAIActions(studentId);

        if (!cancelled && data && Array.isArray(data)) {
          // Map backend response (iconName string) to frontend format (icon component)
          const mapped: AIAction[] = data.map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            action: item.action,
            icon: ICON_MAP[item.iconName] || Play,
            iconClassName: item.iconClassName,
            cardClassName: item.cardClassName,
          }));
          setActions(mapped);
        }
      } catch {
        // On error, keep using the fallback static data
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchActions();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.22em] text-white/55">
          AI Actions
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {loading
          ? // Skeleton placeholders while loading
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[140px] animate-pulse rounded-2xl border border-white/5 bg-white/5"
              />
            ))
          : actions.map((action) => (
              <ActionCard key={action.id} action={action} />
            ))}
      </div>
    </section>
  );
}