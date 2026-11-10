import Link from "next/link";
import { Flag } from "lucide-react";

export default function LandingReports() {
  return (
    <section id="reportes" className="community-card home-anchor" aria-labelledby="landing-reports-title">
      <p className="micro label">Información local</p>
      <h3 id="landing-reports-title">¿Cambió tu ruta?</h3>
      <p>Cuéntanos si viste un cambio de recorrido, parada u horario. Los reportes pasan por revisión.</p>
      <Link href="/reportar-error?from=inicio" className="action dark">
        <Flag className="icon" aria-hidden="true" /> Reportar un cambio
      </Link>
    </section>
  );
}
