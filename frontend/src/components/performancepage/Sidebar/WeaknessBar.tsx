interface Props {
    name: string;
    percentage: number;
    subject: string;
    questionsCount: number;
}

export default function WeaknessBar({
    name,
    percentage,
    subject,
    questionsCount,
}: Props) {
    const isVeryWeak = percentage < 50;
    const colorClass = isVeryWeak ? 'text-red-500' : 'text-amber-500';
    const barBgClass = isVeryWeak ? 'bg-red-500' : 'bg-amber-500';

    return (
        <div className="space-y-2 pb-3 border-b border-slate-800/40 last:border-0 last:pb-0">
            <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                    <div className="text-[13px] font-semibold text-slate-200">{name}</div>
                    <div className="text-xs text-slate-500">{subject} &middot; {questionsCount} Qs</div>
                </div>
                <div className={`text-sm font-bold ${colorClass}`}>
                    {percentage}%
                </div>
            </div>

            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-850">
                <div
                    className={`h-full rounded-full ${barBgClass}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}