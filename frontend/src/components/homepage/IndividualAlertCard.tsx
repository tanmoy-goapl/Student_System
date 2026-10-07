import { getStrengthClasses } from '@/utils/getStrengthClasses';

export interface IndividualAlertCardProps {
  stat: {
    id: string;
    title: string;
    subtitle: string;
    icon: React.ElementType;
    remark: string;
  };
}

export default function IndividualAlertCard({
  stat,
}: IndividualAlertCardProps) {
  const Icon = stat.icon;

  const styles = getStrengthClasses(stat.remark);

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-3 transition hover:bg-white/[0.03] ${styles.card}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles.badge}`}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div>
          <h3 className="text-sm font-medium text-white/90">
            {stat.title}
          </h3>

          <p className="mt-0.5 text-xs text-white/45">
            {stat.subtitle}
          </p>
        </div>
      </div>

      <button
        className={`rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition hover:opacity-80 ${styles.badge}`}
      >
        Fix Now
      </button>
    </div>
  );
}