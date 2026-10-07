import { LucideIcon } from 'lucide-react';
import React from 'react';

interface Props {
    title: string;
    Icon: LucideIcon;
    className?: string;
    iconClassName?: string;
    rightContent?: React.ReactNode;
}

export default function SectionTitle({
    title,
    Icon,
    className = 'text-white/60 text-xs font-semibold tracking-widest uppercase mb-3.5',
    iconClassName = 'text-white/40',
    rightContent,
}: Props) {
    return (
        <div className={`flex items-center justify-between gap-2 ${className}`}>
            <div className="flex items-center gap-2">
                <Icon size={14} className={iconClassName} />
                <span>{title}</span>
            </div>
            {rightContent}
        </div>
    );
}