import { ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

export type JobMatchingJob = {
    id: string;
    title: string;
    company: string;
    location: string;
    salary: string;
    matchPercentage: number;
    jobType: ('Full-time' | 'Part-time' | 'Remote OK' | 'Hybrid')[];
    missingSkills: string[];
};

type JobCardProps = {
    job: JobMatchingJob;
};

function JobCard({ job }: JobCardProps) {
    return (
        <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.05]">
            <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                    <h3 className="text-sm font-semibold text-white">{job.title}</h3>
                    <p className="text-xs text-white/55 mt-1">
                        {job.company} · {job.location}
                    </p>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-lg font-bold text-emerald-400">{job.matchPercentage}%</span>
                    <span className="text-xs text-emerald-400/70 uppercase tracking-wide">Match</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
                {job.jobType.map((type) => (
                    <span
                        key={type}
                        className="inline-flex text-xs px-2 py-1 rounded-lg bg-white/5 text-white/70 border border-white/10"
                    >
                        {type}
                    </span>
                ))}
            </div>

            {job.missingSkills.length > 0 && (
                <div className="mb-4 pb-4 border-b border-white/10">
                    <p className="text-xs text-white/55 mb-2">Missing skills:</p>
                    <div className="flex flex-wrap gap-2">
                        {job.missingSkills.map((skill) => (
                            <span
                                key={skill}
                                className="inline-flex text-xs px-2 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 text-xs font-medium text-white/70 hover:text-white/90 rounded-lg border border-white/10 px-3 py-2 transition hover:bg-white/5">
                    <ExternalLink className="h-3 w-3" />
                    View JD
                </button>
                <button className="flex-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 transition">
                    Apply Now
                </button>
            </div>
        </div>
    );
}

export default function JobMatching({ jobs }: { jobs: JobMatchingJob[] }) {
    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xs uppercase tracking-[0.22em] text-white/55">
                    Job Matching
                </h2>
                <a href="#" className="text-xs text-blue-400 hover:text-blue-300 transition">
                    View all 46
                </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {jobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                ))}
            </div>
        </section>
    );
}