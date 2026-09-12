export type FeedbackGroup = {
  route_keys: string[];
  route_names: string[];
  total: number;
  positive: number;
  negative: number;
  bus_missing: number;
  route_incorrect: number;
  transfer_far: number;
  other: number;
  unspecified: number;
};

export type FeedbackSummary = { groups: FeedbackGroup[]; previous: { total: number; positive: number } };

const DAY = 86_400_000;
const dateOnly = (time: number) => new Date(time).toISOString().slice(0, 10);
function validDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && dateOnly(Date.parse(value)) === value;
}

export function feedbackPeriod(from?: string, to?: string, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(now);
  const end = validDate(to) && to <= today ? to : today;
  const start = validDate(from) && from <= end && Date.parse(end) - Date.parse(from) < 366 * DAY
    ? from : dateOnly(Date.parse(end) - 29 * DAY);
  return {
    from: start, to: end,
    // Uruapan uses UTC-6 year-round. End is exclusive to include the whole last day.
    fromTimestamp: `${start}T00:00:00-06:00`,
    untilTimestamp: `${dateOnly(Date.parse(end) + DAY)}T00:00:00-06:00`,
  };
}

export function feedbackTotals(groups: FeedbackGroup[]) {
  return groups.reduce((sum, group) => ({ total: sum.total + group.total, positive: sum.positive + group.positive, negative: sum.negative + group.negative }), { total: 0, positive: 0, negative: 0 });
}
