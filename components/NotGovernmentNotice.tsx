type Props = {
  /** "compact" para footer/landing chico, "full" para página de privacidad */
  variant?: "compact" | "full";
};

export default function NotGovernmentNotice({ variant = "compact" }: Props) {
  if (variant === "compact") {
    return (
      <div
        role="note"
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] font-semibold"
        style={{
          borderColor: "var(--public-border)",
          background: "var(--public-surface)",
          color: "var(--public-ink)",
        }}
      >
        <span aria-hidden="true">⚠️</span>
        <span>
          <span className="font-bold" style={{ color: "var(--public-ink)" }}>Sitio independiente.</span>{" "}
          No pertenece al gobierno municipal ni estatal.
        </span>
      </div>
    );
  }

  return (
    <aside
      role="note"
      aria-label="Aviso sobre la naturaleza independiente del proyecto"
      className="rounded-lg border p-5"
      style={{
        borderColor: "rgba(184,232,64,0.2)",
        background: "rgba(184,232,64,0.04)",
      }}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
          style={{ background: "var(--public-surface)", color: "var(--public-muted)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="8" r="1" fill="currentColor" />
          </svg>
        </span>
        <div>
          <p className="font-sans text-lg font-bold" style={{ color: "var(--public-ink)" }}>
            Este sitio <span className="italic" style={{ color: "var(--public-accent)" }}>no es oficial</span>.
          </p>
          <p className="mt-2 text-sm leading-7" style={{ color: "var(--public-ink)" }}>
            UruGo es un proyecto <strong style={{ color: "var(--public-ink)" }}>independiente y sin fines de lucro</strong> hecho por un vecino de Uruapan como una herramienta para todas las personas — habitantes, estudiantes y turistas — que necesitan moverse en transporte público por la ciudad.
          </p>
          <p className="mt-3 text-sm leading-7" style={{ color: "var(--public-ink)" }}>
            <strong style={{ color: "var(--public-ink)" }}>No pertenece al Gobierno de Uruapan</strong>, al Gobierno del Estado de Michoacán, al SITU, al COCOTRA ni a ninguna empresa concesionaria. La información se basa en datos públicos y observación de campo. Para trámites o cambios oficiales, consulta los canales oficiales del transporte de Uruapan.
          </p>
        </div>
      </div>
    </aside>
  );
}
