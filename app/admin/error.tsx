"use client";

export default function AdminError({ retry }: { error: unknown; retry: () => void }) {
  return <main className="grid min-h-dvh place-items-center bg-[var(--admin-bg)] px-5 text-[var(--brand-white)]">
    <section className="admin-card max-w-lg p-6" role="alert">
      <p className="text-xs font-bold uppercase text-[var(--brand-lime)]">Administración</p>
      <h1 className="mt-2 text-2xl font-bold">No pudimos completar esta acción</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--admin-muted)]">Comprueba la conexión y vuelve a cargar el panel. Antes de repetir una publicación, revisa el historial para confirmar si se guardó.</p>
      <button onClick={retry} className="admin-button admin-primary mt-5 min-h-11 px-4 font-semibold">Volver a cargar</button>
      <a href="/admin" className="ml-3 inline-flex min-h-11 items-center text-sm underline">Ir a reportes</a>
    </section>
  </main>;
}
