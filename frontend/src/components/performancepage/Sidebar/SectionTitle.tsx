import { LucideIcon } from 'lucide-react';

interface Props {
    title: string;
    Icon: LucideIcon;
}

export default function SectionTitle({
    title,
    Icon,
}: Props) {
    return (
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Icon size={16} />
            <span>{title}</span>
        </div>
    );
}