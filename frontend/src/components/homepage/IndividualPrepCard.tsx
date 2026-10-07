export interface IndividualPrepCardProps {
  stat: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: any;
    iconClassName: string;
  };
}

export default function IndividualPrepCard({ stat }: IndividualPrepCardProps) {
  const Icon = stat.icon;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconClassName}`}
          >
            <Icon className="h-4 w-4" />
          </div>

          <p className="text-[0.7rem] text-white/70">{stat.title}</p>
        </div>

        <p className="text-2xl font-semibold tracking-tight text-white">
          {stat.value}
        </p>
      </div>

      <p className="mt-3 text-xs text-white/45">{stat.subtitle}</p>
    </div>
  );
}