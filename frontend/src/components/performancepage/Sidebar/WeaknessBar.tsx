interface Props {
    name: string;
    percentage: number;
    color: string;
}

export default function WeaknessBar({
    name,
    percentage,
    color,
}: Props) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-200">
                <span>{name}</span>
                <span>{percentage}%</span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}