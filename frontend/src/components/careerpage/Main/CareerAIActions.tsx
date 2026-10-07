import { ArrowRight, FileText, Mic, Zap, Brain } from 'lucide-react';
import { CareerDataResponse } from '@/lib/api';

const ICON_MAP: Record<string, any> = {
  FileText,
  Mic,
  Zap,
  Brain
};

export default function CareerAIActions({ actions }: { actions: CareerDataResponse["aiActions"] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.22em] text-white/55">
          AI Career Actions
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action: any) => {
            const Icon = ICON_MAP[action.iconName] || FileText;
            return (
              <div
                key={action.id}
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
        })}
      </div>
    </section>
  );
}
