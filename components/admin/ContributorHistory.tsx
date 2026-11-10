import { History } from "lucide-react";
import { formatContributorHistory, type ContributorReputation } from "@/lib/community-reputation";

type Props = {
  reputation: ContributorReputation | null;
};

export default function ContributorHistory({ reputation }: Props) {
  if (!reputation) return null;

  return (
    <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-[var(--admin-muted)]">
      <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand-lime)]" aria-hidden="true" />
      <span>
        <span className="font-bold text-[var(--admin-muted)]">Historial de esta instalación:</span>{" "}
        {formatContributorHistory(reputation)}
      </span>
    </p>
  );
}
