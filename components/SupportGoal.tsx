import { formatSupportAmount, type SupportGoal as Goal } from "@/lib/support-contributions";

export default function SupportGoal({ goal }: { goal: Goal }) {
  const progress = Math.round(goal.raised_cents / goal.target_cents * 100);
  const month = new Date(`${goal.month}T12:00:00Z`).toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "America/Mexico_City" });
  return <section className="support-goal" aria-label={`Meta de apoyo de ${month}`}>
    <div className="support-goal-heading"><div><p className="support-eyebrow">Meta de {month}</p><h3>Un mes más en movimiento.</h3></div><strong>{progress}%</strong></div>
    <p>{goal.description}</p>
    <div className="support-goal-track" role="progressbar" aria-label="Avance de la meta mensual" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, progress)} aria-valuetext={`${formatSupportAmount(goal.raised_cents)} de ${formatSupportAmount(goal.target_cents)} MXN`}><span style={{ width: `${Math.min(100, progress)}%` }} /></div>
    <div className="support-goal-amounts"><strong>{formatSupportAmount(goal.raised_cents)} MXN</strong><span>de {formatSupportAmount(goal.target_cents)} MXN</span></div>
    <small>Avance con aportes confirmados este mes y de monto público. Los montos ocultos y los apoyos privados no se incluyen.</small>
  </section>;
}
