"use client";

import { CalendarCheck2, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { recordRouteFieldVerification } from "@/app/admin/actions";
import { INITIAL_ROUTE_VERIFICATION_STATE } from "@/lib/admin-route-verification";

type Props = {
  routeId: number;
  dataVersion: number;
  lastVerifiedAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Todavía no tiene una verificación fechada.";
  return `Última verificación: ${new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: "America/Mexico_City",
  }).format(new Date(value))}.`;
}

export default function RouteVerificationForm({ routeId, dataVersion, lastVerifiedAt }: Props) {
  const [state, action, pending] = useActionState(
    recordRouteFieldVerification,
    INITIAL_ROUTE_VERIFICATION_STATE,
  );

  return (
    <section className="grid gap-4 lg:grid-cols-[265px_minmax(0,1fr)]" aria-labelledby="field-verification-heading">
      <div>
        <CalendarCheck2 className="h-6 w-6 text-[#57d6e8]" strokeWidth={1.7} aria-hidden="true" />
        <h2 id="field-verification-heading" className="mt-2 text-lg font-bold">Verificación de campo</h2>
        <p className="mt-2 text-xs leading-5 text-[var(--admin-muted)]">{formatDate(lastVerifiedAt)}</p>
      </div>

      <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px] sm:items-end">
        <input type="hidden" name="routeId" value={routeId} />
        <input type="hidden" name="expectedVersion" value={dataVersion} />
        <label className="block text-xs font-bold text-[var(--admin-muted)]">
          Qué comprobaste y cómo
          <textarea
            name="note"
            required
            minLength={10}
            maxLength={1_000}
            rows={3}
            placeholder="Ej. Confirmé el recorrido al tomar el camión desde el Centro."
            className="admin-field mt-1 block w-full resize-y"
          />
        </label>
        <button
          disabled={pending}
          className="admin-button inline-flex min-h-11 items-center justify-center gap-2 px-4 text-xs font-bold"
        >
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />}
          {pending ? "Registrando..." : "Confirmar verificación"}
        </button>
        {state.status === "error" && (
          <p className="text-xs leading-5 text-[#f1b3ac] sm:col-span-2" role="alert">{state.message}</p>
        )}
      </form>
    </section>
  );
}
