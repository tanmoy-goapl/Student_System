import {
  Target,
  TriangleAlert,
  CalendarDays,
  Play,
  NotebookPen,
  RefreshCw,
  Heart,
  FireExtinguisherIcon,
  Book,
  Trophy,
  BookOpenText,
  Flame,
  RefreshCcw,
  LineChart,
  Calendar,
} from 'lucide-react';


export const MODEL_MODE = [
  { label: 'Explain', value: 'explain' },
  { label: 'Practice', value: 'practice' },
  { label: 'Analyze', value: 'analyze' },
  { label: 'Improve', value: 'improve' },
  { label: 'Career', value: 'career' },
]

export const EXAM_OVERVIEW_STATS = [
  {
    id: 'readiness',
    title: 'Exam Readiness',
    value: '62%',
    subtitle: '+ 4% this week',
    icon: Target,
    iconClassName:
      'text-violet-400 bg-violet-500/10 border border-violet-500/20',
  },
  {
    id: 'weak-topics',
    title: 'Weak Topics',
    value: '7',
    subtitle: '3 critical',
    icon: TriangleAlert,
    iconClassName:
      'text-amber-400 bg-amber-500/10 border border-amber-500/20',
  },
  {
    id: 'days-left',
    title: 'Days to Exam',
    value: '12',
    subtitle: 'JEE Main 2025',
    icon: CalendarDays,
    iconClassName:
      'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20',
  },
];

export const MENTOR_AI_CARD = {
  title: 'Mentor AI • Now',
  message:
    'You need to focus on Wave Optics and Calculus today. These are your two most critical weak areas before the exam.',
  primaryAction: 'Start Focus Session',
  secondaryAction: 'See Full Plan',
  logo: 'mentor-logo.png'
};

export const AI_ACTIONS = [
  {
    id: 'resume-learning',
    title: 'Resume Learning',
    subtitle: 'Wave Optics Ch.3',
    action: 'Go',
    icon: Play,
    iconClassName:
      'text-violet-400 bg-violet-500/10 border border-violet-500/20',
    cardClassName:
      'from-[#171B4B] via-[#10153A] to-[#0B102B] border-violet-500/20',
  },
  {
    id: 'fix-weak-areas',
    title: 'Fix Weak Areas',
    subtitle: '7 topics pending',
    action: 'Go',
    icon: Target,
    iconClassName:
      'text-rose-400 bg-rose-500/10 border border-rose-500/20',
    cardClassName:
      'from-[#3A1320] via-[#24111D] to-[#151019] border-rose-500/20',
  },
  {
    id: 'practice-test',
    title: 'Take Practice Test',
    subtitle: 'Full mock – 3hr',
    action: 'Go',
    icon: NotebookPen,
    iconClassName:
      'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20',
    cardClassName:
      'from-[#062A3B] via-[#071F2D] to-[#081722] border-cyan-500/20',
  },
  {
    id: 'quick-revision',
    title: 'Quick Revision',
    subtitle: 'Last 5 topics',
    action: 'Go',
    icon: RefreshCw,
    iconClassName:
      'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
    cardClassName:
      'from-[#0E3324] via-[#0B241B] to-[#081A14] border-emerald-500/20',
  },
];

export const WEAKNESS_MAP_RESPONSE = {
  subjects: [
    {
      id: 'physics',
      subject: 'Physics',
      color: 'violet',
      expanded: true,
      topics: [
        {
          id: 'wave-optics',
          name: 'Wave Optics',
          strength: 'weak',
        },
        {
          id: 'electrostatics',
          name: 'Electrostatics',
          strength: 'weak',
        },
        {
          id: 'current-electricity',
          name: 'Current Electricity',
          strength: 'medium',
        },
        {
          id: 'mechanics',
          name: 'Mechanics',
          strength: 'strong',
        },
        {
          id: 'thermodynamics',
          name: 'Thermodynamics',
          strength: 'medium',
        },
      ],
    },

    {
      id: 'mathematics',
      subject: 'Mathematics',
      color: 'violet',
      expanded: false,
      topics: [
        {
          id: 'limits-derivatives',
          name: 'Limits & Derivatives',
          strength: 'weak',
        },
        {
          id: 'integration',
          name: 'Integration',
          strength: 'weak',
        },
        {
          id: 'vectors-3d',
          name: 'Vectors & 3D',
          strength: 'medium',
        },
        {
          id: 'probability',
          name: 'Probability',
          strength: 'strong',
        },
        {
          id: 'matrices',
          name: 'Matrices',
          strength: 'medium',
        },
      ],
    },

    {
      id: 'chemistry',
      subject: 'Chemistry',
      color: 'cyan',
      expanded: false,
      topics: [
        {
          id: 'organic-reactions',
          name: 'Organic Reactions',
          strength: 'weak',
        },
        {
          id: 'chemical-bonding',
          name: 'Chemical Bonding',
          strength: 'medium',
        },
        {
          id: 'coordination-compounds',
          name: 'Coordination Compounds',
          strength: 'weak',
        },
        {
          id: 'thermochemistry',
          name: 'Thermochemistry',
          strength: 'strong',
        },
        {
          id: 'periodic-table',
          name: 'Periodic Table',
          strength: 'strong',
        },
      ],
    },
  ],
};

export const TODAY_STUDY_PLAN_RESPONSE = {
  totalSessions: 3,
  sessions: [
    {
      id: 'wave-optics',
      title: 'Wave Optics – Interference',
      time: '9:00 AM',
      duration: '45 min',
      tag: 'Physics',
      tagColor: 'violet',
      completed: false,
    },
    {
      id: 'limits-derivatives',
      title: 'Limits & Derivatives',
      time: '10:00 AM',
      duration: '40 min',
      tag: 'Calculus',
      tagColor: 'violet',
      completed: false,
    },
    {
      id: 'organic-reactions',
      title: 'Organic Chemistry — Reactions',
      time: '11:00 AM',
      duration: '35 min',
      tag: 'Chemistry',
      tagColor: 'emerald',
      completed: true,
    },
  ],
};


export const PERFORMANCE_SNAPSHOTS = [
  {
    id: 'overall-accuracy',
    title: 'Overall Accuracy',
    value: '67%',
    subtitle: '+3% improvement this week',
    icon: Target,

    iconClassName:
      'text-violet-300 bg-violet-500/10 border border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.15)]',

    valueClassName: 'text-violet-200',

    cardClassName:
      'border-violet-500/10 bg-gradient-to-br from-violet-500/[0.08] via-[#0F1020] to-[#090B1A]',
  },
  {
    id: 'study-streak',
    title: 'Study Streak',
    value: '9 Days',
    subtitle: 'Personal best: 14 days',
    icon: Flame,

    iconClassName:
      'text-orange-300 bg-orange-500/10 border border-orange-500/20 shadow-[0_0_20px_rgba(251,146,60,0.15)]',

    valueClassName: 'text-orange-200',

    cardClassName:
      'border-orange-500/10 bg-gradient-to-br from-orange-500/[0.08] via-[#0F1020] to-[#090B1A]',
  },
  {
    id: 'topics-covered',
    title: 'Topics Covered',
    value: '34 / 72',
    subtitle: 'Physics: 12 · Math: 15 · Chem: 7',
    icon: BookOpenText,

    iconClassName:
      'text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.15)]',

    valueClassName: 'text-cyan-200',

    cardClassName:
      'border-cyan-500/10 bg-gradient-to-br from-cyan-500/[0.08] via-[#0F1020] to-[#090B1A]',
  },

  {
    id: 'badges-earned',
    title: 'Badges Earned',
    value: '12',
    subtitle: '2 new achievements unlocked',
    icon: Trophy,

    iconClassName:
      'text-amber-300 bg-amber-500/10 border border-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.15)]',

    valueClassName: 'text-amber-200',

    cardClassName:
      'border-amber-500/10 bg-gradient-to-br from-amber-500/[0.08] via-[#0F1020] to-[#090B1A]',
  },
];

export const AI_ALERTS = [
  {
    id: 'revision-overdue',
    title: 'Revision Overdue',
    subtitle: "You haven't revised Wave Optics in 3 days. Risk of forgetting is high.",
    icon: RefreshCcw,
    remark: 'medium'
  },
  {
    id: 'accuracy-drop',
    title: 'Accuracy Drop Detected',
    subtitle: "Your accuracy in Calculus dropped from 74% to 58% this week.",
    icon: LineChart,
    remark: 'weak'
  },
  {
    id: 'exam-reminder',
    title: 'Exam in 12 Days',
    subtitle: "Only 3 of 7 weak topics have been addressed. Accelerate your pace.",
    icon: Calendar,
    remark: 'neutral'
  },

]