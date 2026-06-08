import { LucideIcon } from 'lucide-react';

interface Props {
    text: string;
    color: 'yellow' | 'purple' | 'green' | 'orange';
    Icon: LucideIcon;
}

const styles = {
    yellow: {
        border: 'border-amber-500/20',
        bg: 'bg-amber-500/[0.03]',
        iconColor: 'text-amber-500',
    },
    purple: {
        border: 'border-violet-500/20',
        bg: 'bg-violet-500/[0.03]',
        iconColor: 'text-violet-400',
    },
    green: {
        border: 'border-emerald-500/20',
        bg: 'bg-emerald-500/[0.03]',
        iconColor: 'text-emerald-500',
    },
    orange: {
        border: 'border-orange-500/20',
        bg: 'bg-orange-500/[0.03]',
        iconColor: 'text-orange-500',
    },
};

export default function InsightCard({ text, color, Icon }: Props) {
    const style = styles[color] || styles.yellow;
    
    return (
        <div
            className={`flex items-start gap-3.5 rounded-2xl border p-4 text-[13px] leading-relaxed shadow-sm bg-slate-950/20 ${style.border} ${style.bg}`}
        >
            <div className={`mt-0.5 flex-shrink-0 ${style.iconColor}`}>
                <Icon size={16} />
            </div>
            <div className="flex-1 text-slate-400">
                {text}
            </div>
        </div>
    );
}