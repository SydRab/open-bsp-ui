// [crm] P3-10a/b: the date-range preset used by every /stats/* report
// page -- factored out once a second page (P3-10b) needed the exact same
// "all time / 7 / 30 / 90 days" picker P3-10a already built.
import { useMemo, useState } from "react";

export const REPORT_RANGES = [
  { key: "all", label: "Todo", days: null },
  { key: "7", label: "7 días", days: 7 },
  { key: "30", label: "30 días", days: 30 },
  { key: "90", label: "90 días", days: 90 },
] as const;

export type ReportRangeKey = (typeof REPORT_RANGES)[number]["key"];

export function useReportDateRange() {
  const [range, setRange] = useState<ReportRangeKey>("all");

  const from = useMemo(() => {
    const preset = REPORT_RANGES.find((r) => r.key === range);
    if (!preset?.days) return null;
    return new Date(
      Date.now() - preset.days * 24 * 60 * 60 * 1000,
    ).toISOString();
  }, [range]);

  return { range, setRange, from };
}
