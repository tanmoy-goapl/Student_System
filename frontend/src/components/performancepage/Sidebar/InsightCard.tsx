import { LucideIcon } from 'lucide-react';

interface Props {
    text: string;
    color: 'yellow' | 'purple' | 'green' | 'orange';
    Icon: LucideIcon;
}

const styles = {
    yellow: {
        border: 'border-amber-500/20',
        bg: 'bg-amber-500/5',
        iconColor: 'text-amber-400',
    },
    purple: {
        border: 'border-violet-500/20',
        bg: 'bg-violet-500/5',
        iconColor: 'text-violet-400',
    },
    green: {
        border: 'border-emerald-500/20',
        bg: 'bg-emerald-500/5',
        iconColor: 'text-emerald-400',
    },
    orange: {
        border: 'border-orange-500/20',
        bg: 'bg-orange-500/5',
        iconColor: 'text-orange-400',
    },
};

export default function InsightCard({ text, color, Icon }: Props) {
    const style = styles[color] || styles.yellow;
    
    return (
        <div
            className={`flex items-start gap-3 rounded-lg border p-3 text-xs leading-relaxed backdrop-blur-sm hover:border-white/30 transition-all ${style.border} ${style.bg}`}
        >
            <div className={`mt-0.5 flex-shrink-0 ${style.iconColor}`}>
                <Icon size={14} className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 text-white/80 font-medium">
                {text}
            </div>
        </div>
    );
}