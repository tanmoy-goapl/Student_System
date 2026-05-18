import { AI_ALERTS } from "@/constants/homepage-data";
import IndividualAlertCard from "./IndividualAlertCard";

export default function AIAlertCard() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.22em] text-white/55">
          AI Alerts
        </h2>
      </div>

      <div className="space-y-2">
        {AI_ALERTS.map((stat) => (
          <IndividualAlertCard key={stat.id} stat={stat} />
        ))}
      </div>
    </section>
  )
}