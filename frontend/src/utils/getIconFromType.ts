import {
    FileText,
    Briefcase,
    Target,
    Clock,
    LucideIcon,
    HelpCircle,
} from "lucide-react";

const ICON_TYPE_MAP: Record<string, LucideIcon> = {
    "resume-score": FileText,
    "interview-ready": Briefcase,
    "skill-match": Target,
    deadline: Clock,
};

export function getIconFromType(type: string): LucideIcon {
    return ICON_TYPE_MAP[type] || HelpCircle;
}