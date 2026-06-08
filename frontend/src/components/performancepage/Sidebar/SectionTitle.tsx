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
    className = 'text-slate-200',
    iconClassName,
    rightContent,
}: Props) {
    return (
        <div className={`flex items-center justify-between gap-2 text-sm font-semibold ${className}`}>
            <div className="flex items-center gap-2">
                <Icon size={16} className={iconClassName} />
                <span>{title}</span>
            </div>
            {rightContent}
        </div>
    );
}