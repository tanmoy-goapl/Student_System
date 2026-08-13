import { useState } from "react";
import TimeRange, { TimeRangeOption } from "./TimeRange";
import SubjectFilter, { SubjectOption } from "./SubjectFilter";
import ModeFilter, { ModeOption } from "./ModeFilter";
import GoalContext, { GoalType } from "./GoalContext";

interface PerformanceSidebarProps {
    onFilterChange?: (filters: {
        timeRange: TimeRangeOption;
        subject: SubjectOption;
        mode: ModeOption;
        goal: GoalType;
    }) => void;
}

export default function PerformanceSidebar({
    onFilterChange,
}: PerformanceSidebarProps) {
    const [timeRange, setTimeRange] = useState<TimeRangeOption>("last7days");
    const [subject, setSubject] = useState<SubjectOption>("all");
    const [mode, setMode] = useState<ModeOption>("all");
    const [goal, setGoal] = useState<GoalType>("exam");

    const handleTimeRangeChange = (newRange: TimeRangeOption) => {
        setTimeRange(newRange);
        onFilterChange?.({ timeRange: newRange, subject, mode, goal });
    };

    const handleSubjectChange = (newSubject: SubjectOption) => {
        setSubject(newSubject);
        onFilterChange?.({ timeRange, subject: newSubject, mode, goal });
    };

    const handleModeChange = (newMode: ModeOption) => {
        setMode(newMode);
        onFilterChange?.({ timeRange, subject, mode: newMode, goal });
    };

    const handleGoalChange = (newGoal: GoalType) => {
        setGoal(newGoal);
        onFilterChange?.({ timeRange, subject, mode, goal: newGoal });
    };

    return (
        <div className="bg-[#090D1F] w-[20vw] h-screen flex flex-col text-white">
            <div className="flex-1 overflow-y-auto purple-scrollbar">
                <TimeRange selected={timeRange} onSelect={handleTimeRangeChange} />

                <SubjectFilter selected={subject} onSelect={handleSubjectChange} />

                <ModeFilter selected={mode} onSelect={handleModeChange} />

                <GoalContext selected={goal} onSelect={handleGoalChange} />
            </div>
        </div>
    );
}