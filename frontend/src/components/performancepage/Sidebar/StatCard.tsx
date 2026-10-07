interface Props {
    title: string;
    value: string;
    subtitle: string;
    color: 'purple' | 'green' | 'yellow';
}

const styles = {
    purple: {
        bg: 'bg-violet-500/5',
        border: 'border-violet-500/20',
        text: 'text-violet-400',
    },
    green: {
        bg: 'bg-emerald-500/5',
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
    },
    yellow: {
        bg: 'bg-yellow-500/5',
        border: 'border-yellow-500/20',
        text: 'text-yellow-400',
    },
};

export default function StatCard({
    title,
    value,
    subtitle,
    color,
}: Props) {
    const style = styles[color] || styles.purple;
    return (
        <div
            className={`rounded-lg border p-3 backdrop-blur-sm hover:border-white/20 transition-all ${style.bg} ${style.border}`}
        >
            <p className="text-[10px] text-white/50 leading-tight font-medium uppercase tracking-wider">{title}</p>

            <h3 className="mt-1.5 text-base font-bold text-white leading-tight">
                {value}
            </h3>

            <p className="mt-1 text-[10px] text-white/30 leading-snug">{subtitle}</p>
        </div>
    );
}