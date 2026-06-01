import { CAREER_KPI_DATA } from "@/constants/careerpage-data";
import KPICard from "./KPICard";

export default function CareerKPICards() {
    return (
        <div className="flex items-center gap-2 rounded-3xl border border-violet-500/10 bg-[#090B1A] p-2" >
            {
                CAREER_KPI_DATA.map((item) => (
                    <KPICard key={item.id} data={item} />
                ))
            }
        </div>
    )
}