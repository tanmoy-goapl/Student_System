interface Props {
    title: string;
    subtitle: string;
    tag: string;
    color: 'red' | 'purple' | 'yellow';
}

const styles = {
    red: 'bg-red-500/20 border-red-400',
    purple: 'bg-violet-500/20 border-violet-400',
    yellow: 'bg-yellow-400/20 border-yellow-400',
};

export default function ActionCard({
    title,
    subtitle,
    tag,
    color,
}: Props) {
    return (
        <div
            className={`rounded-2xl border p-4 shadow-md ${styles[color]}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h3 className="font-semibold text-white">
                        {title}
                    </h3>

                    <p className="mt-1 text-xs text-slate-300">
                        {subtitle}
                    </p>
                </div>

                <span className="rounded-lg bg-black/20 px-2 py-1 text-[10px] text-white">
                    {tag}
                </span>
            </div>
        </div>
    );
}