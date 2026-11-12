import Link from "next/link";

export default function AdminPagination({ page, pageSize, total, href, itemLabel = "reportes" }: {
  page: number; pageSize: number; total: number; href: (page: number) => string; itemLabel?: string;
}) {
  if (!total) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <nav aria-label={`Páginas de ${itemLabel}`} className="admin-pagination">
    <p className="text-sm text-[var(--admin-muted)]">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total} {itemLabel}</p>
    <div className="flex items-center gap-3">
      {page > 1 ? <Link className="admin-button inline-flex min-h-11 items-center px-3 text-sm font-semibold" href={href(page - 1)}>Anterior</Link> : <span className="px-3 text-sm text-[var(--admin-muted)]" aria-disabled="true">Anterior</span>}
      <span className="text-xs tabular-nums">{page} / {pages}</span>
      {page < pages ? <Link className="admin-button inline-flex min-h-11 items-center px-3 text-sm font-semibold" href={href(page + 1)}>Siguiente</Link> : <span className="px-3 text-sm text-[var(--admin-muted)]" aria-disabled="true">Siguiente</span>}
    </div>
  </nav>;
}
