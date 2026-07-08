import { QuickAction } from "@/constants/learningpage-data";
import { actionVariants } from "@/utils/actionVariants";
import { Sparkles } from "lucide-react";

interface QuickActionsProps {
    actions: QuickAction[];
    onActionClick?: (id: string) => void;
}


interface QuickActionButtonProps {
    action: QuickAction;
    onClick?: (id: string) => void;
}

function QuickActionButton({
    action,
    onClick,
}: QuickActionButtonProps) {
    const Icon = action.icon;

    return (
        <button
            onClick={() => action.onClick ? action.onClick(action.id) : onClick?.(action.id)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-xs transition-all duration-200 ${actionVariants[action.variant]}`}
        >
            <Icon className="h-4 w-4" />
            {action.label}
        </button>
    );
}

export function QuickActions({
    actions,
    onActionClick,
}: QuickActionsProps) {
    return (
        <div className="space-y-4 rounded-xl border border-white/10 bg-none p-5">
            <div className="flex gap-2 items-center text-xs">
                <Sparkles className="h-4 w-4 text-[#A5B4FC]" />
                <span className="opacity-[50%]">AI Actions on selected text:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 ">
                {actions.map((action) => (
                    <QuickActionButton
                        key={action.id}
                        action={action}
                        onClick={onActionClick}
                    />
                ))}
            </div>
        </div>
    );
}