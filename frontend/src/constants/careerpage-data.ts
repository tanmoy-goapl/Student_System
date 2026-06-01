export type CareerKPIReponse = {
    id: number,
    type: string,
    title: string,
    value: number,
    unit: string,
    subheading: string
    iconClassName: string;
}
export const CAREER_KPI_DATA: CareerKPIReponse[] = [
    {
        id: 0,
        type: 'resume-score',
        title: 'Resume Score',
        value: 74,
        unit: '/100',
        subheading: '+6 this week',
        iconClassName: 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
    },
    {
        id: 1,
        type: 'interview-ready',
        title: 'Interview Ready',
        value: 61,
        unit: '%',
        subheading: '+4 this week',
        iconClassName:
            'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
    },
    {
        id: 2,
        type: 'skill-match',
        title: 'Skill Match',
        value: 68,
        unit: '%',
        subheading: 'Top role: Google',
        iconClassName:
            'text-violet-400 bg-violet-500/10 border border-violet-500/20'
    },
    {
        id: 3,
        type: 'deadline',
        title: 'Days to Deadline',
        value: 68,
        unit: '%',
        subheading: 'Top role: Google',
        iconClassName:
            'text-red-400 bg-red-500/10 border border-red-500/20'
    },
]