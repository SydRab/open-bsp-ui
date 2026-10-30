// [crm] P3-10a/b: the preset-row filter every /stats/* report page uses.
import { REPORT_RANGES, type ReportRangeKey } from "@/hooks/useReportDateRange";
import { useTranslation } from "@/hooks/useTranslation";

export default function ReportDateRangeButtons({
  range,
  onChange,
}: {
  range: ReportRangeKey;
  onChange: (range: ReportRangeKey) => void;
}) {
  const { translate: t } = useTranslation();

  return (
    <div className="flex gap-[6px]">
      {REPORT_RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          className={`text-[13px] px-[10px] py-[4px] rounded-full border ${
            range === r.key
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground"
          }`}
          onClick={() => onChange(r.key)}
        >
          {t(r.label)}
        </button>
      ))}
    </div>
  );
}
