interface Props {
    readiness: {
        subject: string;
        value: number;
    }[];
}

export default function ReadinessCard({
    readiness,
}: Props) {
    return (
        <div className="rounded-3xl border border-emerald-400 bg-emerald-500/20 p-5 shadow-md">
            <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                    Exam Readiness
                </h2>

                <span className="text-3xl font-bold text-emerald-300">
                    68%
                </span>
            </div>

            <div className="space-y-4">
                {readiness.map((item) => (
                    <div key={item.subject}>
                        <div className="mb-1 flex justify-between text-sm text-slate-200">
                            <span>{item.subject}</span>
                            <span>{item.value}%</span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-emerald-200/20">
                            <div
                                className="h-full rounded-full bg-cyan-400"
                                style={{
                                    width: `${item.value}%`,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <p className="mt-5 text-sm text-emerald-100">
                ● On track · 47 days to exam
            </p>
        </div>
    );
}