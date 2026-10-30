// [crm] P3-10a: pipeline reports -- funnel (by status, the fixed lifecycle,
// not stage_id, which is tenant vocabulary with no guaranteed sequence)
// and source/ad performance. The whole /stats section is already gated
// on reports.view (Menu.tsx) -- a permission reserved since P1-02, never
// consumed until now. Conversion rates are computed here from the raw
// counts crm.report_status_funnel/report_source_performance return, not
// pre-divided in SQL.
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SectionBody from "@/components/SectionBody";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type SourcePerformanceRow,
  useSourcePerformanceReport,
  useStatusFunnelReport,
} from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/stats/pipeline")({
  component: PipelineReports,
});

const STATUS_ORDER = [
  "open",
  "qualified",
  "unqualified",
  "converted",
  "dropped",
] as const;

const STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  qualified: "Calificado",
  unqualified: "No calificado",
  converted: "Convertido",
  dropped: "Perdido",
};

const STATUS_COLOR_VAR: Record<string, string> = {
  open: "--lead-status-open",
  qualified: "--lead-status-qualified",
  unqualified: "--lead-status-unqualified",
  converted: "--lead-status-converted",
  dropped: "--lead-status-dropped",
};

const SOURCE_LABELS: Record<string, string> = {
  ctwa_ad: "Anuncio",
  ctwa_post: "Publicación",
  organic: "Orgánico",
  manual: "Manual",
};

const SOURCE_COLOR_VAR: Record<string, string> = {
  ctwa_ad: "--color-cat-1",
  ctwa_post: "--color-cat-2",
  organic: "--color-cat-3",
  manual: "--color-cat-4",
};

const RANGES = [
  { key: "all", label: "Todo", days: null },
  { key: "7", label: "7 días", days: 7 },
  { key: "30", label: "30 días", days: 30 },
  { key: "90", label: "90 días", days: 90 },
] as const;

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function PipelineReports() {
  const { translate: t } = useTranslation();
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("all");

  const from = useMemo(() => {
    const preset = RANGES.find((r) => r.key === range);
    if (!preset?.days) return null;
    return new Date(
      Date.now() - preset.days * 24 * 60 * 60 * 1000,
    ).toISOString();
  }, [range]);

  const { data: funnel } = useStatusFunnelReport(from, null);
  const { data: sourceRows } = useSourcePerformanceReport(from, null);

  const funnelData = STATUS_ORDER.map((status) => ({
    status,
    label: t(STATUS_LABELS[status]),
    count: funnel?.find((r) => r.status === status)?.lead_count ?? 0,
    color: `var(${STATUS_COLOR_VAR[status]})`,
  }));

  const totalLeads = funnelData.reduce((sum, r) => sum + r.count, 0);
  const convertedCount =
    funnelData.find((r) => r.status === "converted")?.count ?? 0;
  const droppedCount =
    funnelData.find((r) => r.status === "dropped")?.count ?? 0;
  const conversionRate =
    totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0;
  const totalDealValue = (sourceRows ?? []).reduce(
    (sum, r) => sum + Number(r.total_deal_value),
    0,
  );

  // One bar per source (not per ad) -- ad-level detail goes in the table below.
  const sourceTotals = useMemo(() => {
    const bySource = new Map<string, { count: number }>();
    for (const row of sourceRows ?? []) {
      const entry = bySource.get(row.source) ?? { count: 0 };
      entry.count += row.lead_count;
      bySource.set(row.source, entry);
    }
    return [...bySource.entries()].map(([source, v]) => ({
      source,
      label: t(SOURCE_LABELS[source] ?? source),
      count: v.count,
      color: `var(${SOURCE_COLOR_VAR[source] ?? "--color-cat-1"})`,
    }));
  }, [sourceRows, t]);

  const adRows = (sourceRows ?? []).filter(
    (r): r is SourcePerformanceRow & { ad_source_id: string } =>
      r.ad_source_id != null,
  );

  return (
    <SectionBody className="gap-[24px]">
      <div className="flex gap-[6px]">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={`text-[13px] px-[10px] py-[4px] rounded-full border ${
              range === r.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
            onClick={() => setRange(r.key)}
          >
            {t(r.label)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[12px]">
        <div className="rounded-xl border border-border p-[12px]">
          <div className="text-[12px] text-muted-foreground">
            {t("Leads totales")}
          </div>
          <div className="text-[22px] font-medium">{totalLeads}</div>
        </div>
        <div className="rounded-xl border border-border p-[12px]">
          <div className="text-[12px] text-muted-foreground">
            {t("Tasa de conversión")}
          </div>
          <div className="text-[22px] font-medium">
            {conversionRate.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-xl border border-border p-[12px]">
          <div className="text-[12px] text-muted-foreground">
            {t("Leads perdidos")}
          </div>
          <div className="text-[22px] font-medium">{droppedCount}</div>
        </div>
        <div className="rounded-xl border border-border p-[12px]">
          <div className="text-[12px] text-muted-foreground">
            {t("Valor ganado")}
          </div>
          <div className="text-[22px] font-medium">
            {formatCurrency(totalDealValue)}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[8px]">
        <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
          {t("Embudo")}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={funnelData}
            layout="vertical"
            margin={{ top: 4, right: 32, left: 8, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={100}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as {
                  label: string;
                  count: number;
                };
                return (
                  <div className="bg-background border border-border rounded-lg px-[10px] py-[6px] text-[12px] shadow-sm">
                    {row.label}:{" "}
                    <span className="font-medium">{row.count}</span>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[0, 3, 3, 0]}>
              {funnelData.map((row) => (
                <Cell key={row.status} fill={row.color} />
              ))}
              <LabelList dataKey="count" position="right" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-[8px]">
        <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
          {t("Origen de los leads")}
        </div>
        {sourceTotals.length === 0 ? (
          <div className="text-[13px] text-muted-foreground">
            {t("Sin datos")}
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={Math.max(sourceTotals.length * 44, 100)}
          >
            <BarChart
              data={sourceTotals}
              layout="vertical"
              margin={{ top: 4, right: 32, left: 8, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as {
                    label: string;
                    count: number;
                  };
                  return (
                    <div className="bg-background border border-border rounded-lg px-[10px] py-[6px] text-[12px] shadow-sm">
                      {row.label}:{" "}
                      <span className="font-medium">{row.count}</span>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {sourceTotals.map((row) => (
                  <Cell key={row.source} fill={row.color} />
                ))}
                <LabelList dataKey="count" position="right" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {adRows.length > 0 && (
        <div className="flex flex-col gap-[8px]">
          <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
            {t("Rendimiento por anuncio")}
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-muted-foreground text-left border-b border-border">
                <th className="py-[6px] font-normal">{t("Anuncio")}</th>
                <th className="py-[6px] font-normal text-right">
                  {t("Leads")}
                </th>
                <th className="py-[6px] font-normal text-right">
                  {t("Convertidos")}
                </th>
                <th className="py-[6px] font-normal text-right">
                  {t("Valor ganado")}
                </th>
              </tr>
            </thead>
            <tbody>
              {adRows
                .sort((a, b) => b.lead_count - a.lead_count)
                .map((row) => (
                  <tr
                    key={`${row.source}:${row.ad_source_id}`}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-[6px]">{row.ad_source_id}</td>
                    <td className="py-[6px] text-right">{row.lead_count}</td>
                    <td className="py-[6px] text-right">
                      {row.converted_count}
                    </td>
                    <td className="py-[6px] text-right">
                      {formatCurrency(Number(row.total_deal_value))}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionBody>
  );
}
