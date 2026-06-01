import { CareerKPIReponse } from "@/constants/careerpage-data"
import { getIconFromType } from "@/utils/getIconFromType"

export type KPICardProps = {
    data: CareerKPIReponse
}

export default function KPICard({ data }: KPICardProps) {
    const Icon = getIconFromType(data.type)
    return (
        <div key={data.id} className="flex flex-1 flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
            <div className="flex items-start justify-between">
                <h3 className="text-[0.7rem] text-white/70">{data.title}</h3>
                <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${data.iconClassName}`}
                >
                    <Icon className="h-4 w-4" />
                </div>
            </div>

            <div className="flex items-center gap-1">
                <h2 className="text-2xl font-semibold text-white">{data.value}</h2>
                <span className="text-sm font-semibold text-white/70">{data.unit}</span>
            </div>

            <p className="text-xs text-white/70">{data.subheading}</p>
        </div>
    )
}