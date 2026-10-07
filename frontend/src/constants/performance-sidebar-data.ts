// constants/performance-data.ts

import {
    Activity,
    Atom,
    BookOpen,
    Flame,
    Target,
    TrendingUp,
} from 'lucide-react';

export const PERFORMANCE_STATS = [
    {
        title: 'Overall Accuracy',
        value: '71%',
        subtitle: '284 of 400 correct',
        badge: '+4.2%',
        icon: Target,
        valueColor: 'text-indigo-400',
        iconColor: 'text-indigo-400',
    },
    {
        title: 'Improvement',
        value: '+18%',
        subtitle: 'vs. last 7 days',
        badge: 'Fastest in Physics',
        icon: TrendingUp,
        valueColor: 'text-emerald-400',
        iconColor: 'text-emerald-400',
    },
    {
        title: 'Study Streak',
        value: '12 days',
        subtitle: 'Personal best: 18',
        badge: 'Keep it going!',
        icon: Flame,
        valueColor: 'text-amber-400',
        iconColor: 'text-amber-400',
    },
    {
        title: 'Topics Mastered',
        value: '34',
        subtitle: 'of 61 total topics',
        badge: '+3 this week',
        icon: BookOpen,
        valueColor: 'text-cyan-400',
        iconColor: 'text-cyan-400',
    },
];

export const TOPIC_MASTERY_DATA = [
    {
        id: 'physics',
        subject: 'Physics',
        icon: Atom,
        progress: 64,
        progressColor: 'from-indigo-500 to-violet-500',
        topics: [
            {
                name: 'Mechanics',
                progress: 88,
                status: 'strong',
            },
            {
                name: 'Thermodynamics',
                progress: 74,
                status: 'strong',
            },
            {
                name: 'Wave Optics',
                progress: 38,
                status: 'weak',
            },
            {
                name: 'Electrostatics',
                progress: 51,
                status: 'weak',
            },
        ],
    },

    {
        id: 'mathematics',
        subject: 'Mathematics',
        icon: BookOpen,
        progress: 58,
        progressColor: 'from-purple-500 to-fuchsia-500',
        topics: [
            {
                name: 'Calculus',
                progress: 81,
                status: 'strong',
            },
            {
                name: 'Probability',
                progress: 68,
                status: 'strong',
            },
            {
                name: 'Coordinate Geometry',
                progress: 42,
                status: 'weak',
            },
            {
                name: 'Trigonometry',
                progress: 49,
                status: 'weak',
            },
        ],
    },

    {
        id: 'chemistry',
        subject: 'Chemistry',
        icon: Activity,
        progress: 72,
        progressColor: 'from-cyan-500 to-sky-500',
        topics: [
            {
                name: 'Organic Chemistry',
                progress: 84,
                status: 'strong',
            },
            {
                name: 'Chemical Bonding',
                progress: 76,
                status: 'strong',
            },
            {
                name: 'Equilibrium',
                progress: 57,
                status: 'weak',
            },
            {
                name: 'Electrochemistry',
                progress: 45,
                status: 'weak',
            },
        ],
    },
];

export const ACCURACY_TREND_DATA = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    accuracy: [62, 67, 65, 70, 68, 74, 72],
    practiceVolume: [52, 61, 58, 67, 71, 78, 75],
};


/** Sidebar **/

import {
    Brain,
    AlertTriangle,
    Sparkles,
    Star,
    ShieldCheck,
    Timer,
    Network,
} from 'lucide-react';

export const insights = [
    {
        id: 1,
        color: 'yellow',
        icon: Timer,
        text: 'You perform 23% better in morning sessions. Try shifting study time to 8–10 AM.',
    },
    {
        id: 2,
        color: 'purple',
        icon: Activity,
        text: 'Pattern: you rush formula derivation steps — take 10s more per numeric question.',
    },
    {
        id: 3,
        color: 'green',
        icon: Network,
        text: 'Accuracy spikes after concept revision. Do a 15-min review before each practice session.',
    },
    {
        id: 4,
        color: 'yellow', // Wait, the last card in the screenshot is yellow/orange color with Timer icon as well! Let's make it yellow.
        icon: Timer,
        text: 'Your strongest window is post 8 PM for conceptual topics. Night reading works for you.',
    },
];

export const weakTopics = [
    {
        name: 'Wave Optics',
        subject: 'Physics',
        questionsCount: 14,
        percentage: 38,
    },
    {
        name: 'Calculus',
        subject: 'Mathematics',
        questionsCount: 22,
        percentage: 42,
    },
    {
        name: 'Electrostatics',
        subject: 'Physics',
        questionsCount: 18,
        percentage: 51,
    },
    {
        name: 'Electrochemistry',
        subject: 'Chemistry',
        questionsCount: 11,
        percentage: 55,
    },
];

export const statCards = [
    {
        title: 'Expected JEE Score',
        value: '187 / 300',
        subtitle: 'Based on 30-day trend',
        color: 'purple',
    },
    {
        title: 'Projected Rank',
        value: '~4,200',
        subtitle: 'If improvement holds',
        color: 'green',
    },
    {
        title: 'Readiness',
        value: '68%',
        subtitle: 'Exam in 47 days',
        color: 'yellow',
    },
];

export const actionCards = [
    {
        title: 'Practice Wave Optics',
        subtitle: 'Target 60%+ accuracy',
        tag: 'Urgent',
        color: 'red',
    },
    {
        title: 'Revise Calculus Basics',
        subtitle: 'Integration fundamentals',
        tag: 'Today',
        color: 'purple',
    },
    {
        title: 'Take Full Mock Test',
        subtitle: 'Chemistry + Maths',
        tag: 'Scheduled',
        color: 'yellow',
    },
];

export const readiness = [
    {
        subject: 'Physics readiness',
        value: 84,
    },
    {
        subject: 'Maths readiness',
        value: 58,
    },
    {
        subject: 'Chemistry readiness',
        value: 72,
    },
];

export const sectionIcons = {
    insights: Brain,
    weakness: AlertTriangle,
    stats: Star,
    actions: Sparkles,
    readiness: ShieldCheck,
};