interface Props {
    text: string;
    color: 'yellow' | 'purple' | 'green' | 'orange';
}

const styles = {
    yellow:
        'bg-yellow-400/20 border-yellow-400 text-yellow-100',
    purple:
        'bg-violet-500/20 border-violet-400 text-violet-100',
    green:
        'bg-emerald-500/20 border-emerald-400 text-emerald-100',
    orange:
        'bg-orange-500/20 border-orange-400 text-orange-100',
};

export default function InsightCard({ text, color }: Props) {
    return (
        <div
            className={`rounded-2xl border p-4 text-sm leading-6 shadow-md ${styles[color]}`}
        >
            {text}
        </div>
    );
}