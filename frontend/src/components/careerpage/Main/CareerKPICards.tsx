import KPICard from "./KPICard";
import { CareerDataResponse } from "@/lib/api";

export default function CareerKPICards({ careerKpi }: { careerKpi: CareerDataResponse["careerKpi"] }) {
    return (
        <div className="flex items-center gap-2 rounded-3xl border border-violet-500/10 bg-[#090B1A] p-2" >
            {
                careerKpi.map((item: any) => (
                    <KPICard key={item.id} data={item} />
                ))
            }
        </div>
    )
}