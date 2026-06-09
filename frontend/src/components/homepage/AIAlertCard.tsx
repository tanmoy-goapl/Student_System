import IndividualAlertCard from "./IndividualAlertCard";
import { HomepageDataResponse } from "@/lib/api";
import { RefreshCcw, LineChart, Calendar } from "lucide-react";

const iconMap: Record<string, any> = {
  RefreshCcw,
  LineChart,
  Calendar
};

export default function AIAlertCard({ alerts }: { alerts: HomepageDataResponse["aiAlerts"] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.22em] text-white/55">
          AI Alerts
        </h2>
      </div>

      <div className="space-y-2">
        {alerts.map((stat: any) => (
          <IndividualAlertCard key={stat.id} stat={{ ...stat, icon: iconMap[stat.iconName] || RefreshCcw }} />
        ))}
      </div>
    </section>
  )
}