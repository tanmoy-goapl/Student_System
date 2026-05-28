interface Props {
    title: string;
    value: string;
    subtitle: string;
    color: 'purple' | 'green' | 'yellow';
}

const styles = {
    purple:
        'bg-violet-500/20 border-violet-400',
    green:
        'bg-emerald-500/20 border-emerald-400',
    yellow:
        'bg-yellow-400/20 border-yellow-400',
};

export default function StatCard({
    title,
    value,
    subtitle,
    color,
}: Props) {
    return (
        <div
            className={`rounded-2xl border p-4 shadow-md ${styles[color]}`}
        >
            <p className="text-xs text-slate-300">{title}</p>

            <h3 className="mt-1 text-2xl font-bold text-white">
                {value}
            </h3>

            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
    );
}