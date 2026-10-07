import { QuickAction } from "@/constants/learningpage-data";
import { actionVariants } from "@/utils/actionVariants";
import { Sparkles } from "lucide-react";

interface QuickActionsProps {
    actions: QuickAction[];
    onActionClick?: (id: string) => void;
}


interface QuickActionWithDescription {
    id: string;
    label: string;
    description?: string;
    icon: any;
    variant: string;
    onClick?: (id: string) => void;
}

interface QuickActionButtonProps {
    action: QuickActionWithDescription;
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
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left w-full transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${(actionVariants as any)[action.variant]}`}
        >
            <Icon className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white">{action.label}</span>
                {action.description && (
                    <span className="text-[10px] text-white/60 mt-1 leading-snug font-medium break-words">
                        {action.description}
                    </span>
                )}
            </div>
        </button>
    );
}

export function QuickActions({
    actions,
    onActionClick,
}: QuickActionsProps) {
    return (
        <div className="rounded-lg border border-white/10 bg-slate-900/50 p-4 space-y-4">
            <div className="flex gap-2 items-center text-xs font-semibold text-slate-400">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span>AI Actions</span>
            </div>
            <div className="flex flex-col gap-2 w-full">
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