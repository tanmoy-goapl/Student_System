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
    const getAccuracyColor = (accuracy: number) => {
        if (accuracy === 0) return "bg-white/10";
        if (accuracy < 40) return "bg-red-500/60";
        if (accuracy < 60) return "bg-orange-500/60";
        return "bg-yellow-500/60";
    };

    const getAccuracyTextColor = (accuracy: number) => {
        if (accuracy === 0) return "text-white/40";
        if (accuracy < 40) return "text-red-400";
        if (accuracy < 60) return "text-orange-400";
        return "text-yellow-400";
    };

    return (
        <div className="group space-y-1.5">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs font-medium text-white">
                        {name}
                    </div>
                    <div className="text-[10px] text-white/40">
                        {subject} &middot; {questionsCount} Qs
                    </div>
                </div>
                <span className={`text-xs font-bold ${getAccuracyTextColor(percentage)}`}>
                    {percentage}%
                </span>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden border border-white/5">
                <div
                    className={`h-full rounded-full transition-all ${getAccuracyColor(percentage)}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}