import Link from "next/link";

type Props = {
  label: string;
  items: { href: string; label: string; count: number | null; selected: boolean }[];
};

export default function AdminStatusNav({ label, items }: Props) {
  return (
    <nav className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,126px),1fr))] gap-2" aria-label={label}>
      {items.map((item) => (
        <Link key={item.href} href={item.href} aria-current={item.selected ? "page" : undefined}
          className={`admin-button flex min-h-12 items-center justify-between gap-2 px-3 py-2 text-xs font-bold ${item.selected ? "admin-primary" : ""}`}>
          <span>{item.label}</span>
          <strong className="text-base tabular-nums">{item.count ?? "–"}</strong>
        </Link>
      ))}
    </nav>
  );
}
