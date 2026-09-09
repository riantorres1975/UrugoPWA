type Props = {
  /** Small label for category or language. */
  kicker?: string;
  /** Small uppercase category label. */
  eyebrow?: string;
  /** Main heading. */
  title: React.ReactNode;
  /** Supporting paragraph. */
  intro?: React.ReactNode;
};

export default function PageHeader({ kicker, eyebrow, title, intro }: Props) {
  return (
    <div>
      <header className="max-w-3xl">
        {kicker && <p className="mb-2 text-xs text-[var(--public-muted)]">{kicker}</p>}
        {eyebrow && (
          <p
            className="text-[11px] font-bold uppercase"
            style={{ color: "var(--public-accent)" }}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className="mt-3 public-page-title"
          style={{ color: "var(--public-ink)" }}
        >
          {title}
        </h1>
        {intro && (
          <p
            className="mt-5 text-base leading-7 md:text-lg"
            style={{ color: "var(--public-secondary)" }}
          >
            {intro}
          </p>
        )}
      </header>
    </div>
  );
}
