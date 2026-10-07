interface Props {
    title: string;
    subtitle: string;
    tag: string;
    color: 'red' | 'purple' | 'yellow';
}

const styles = {
    red: { bg: 'bg-red-500/5', border: 'border-red-500/20', text: 'text-red-400' },
    purple: { bg: 'bg-violet-500/5', border: 'border-violet-500/20', text: 'text-violet-400' },
    yellow: { bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', text: 'text-yellow-400' },
};

export default function ActionCard({
    title,
    subtitle,
    tag,
    color,
}: Props) {
    const style = styles[color] || styles.purple;
    return (
        <div
            className={`rounded-lg border p-3 backdrop-blur-sm hover:border-white/20 transition-all ${style.bg} ${style.border}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-white truncate">
                        {title}
                    </h3>

                    <p className="mt-1 text-[10px] text-white/50 leading-snug">
                        {subtitle}
                    </p>
                </div>

                <span className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-black/30 text-white/70">
                    {tag}
                </span>
            </div>
        </div>
    );
}