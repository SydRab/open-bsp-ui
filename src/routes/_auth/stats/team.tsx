// [crm] P3-10b: team performance -- response times and the rep
// leaderboard. Reads crm.leads' own assigned_at/first_responded_at/
// first_response_due_at directly (not crm.audit_log, whose
// 'lead.first_responded' entry has no reliable per-rep actor). Agent
// names are resolved client-side from useCurrentAgents(), same
// convention every other lead-working modal already uses.
import { createFileRoute } from "@tanstack/react-router";
import ReportDateRangeButtons from "@/components/ReportDateRangeButtons";
import SectionBody from "@/components/SectionBody";
import { useReportDateRange } from "@/hooks/useReportDateRange";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgents } from "@/queries/useAgents";
import {
  useRepLeaderboardReport,
  useResponseTimesReport,
} from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/stats/team")({
  component: TeamReports,
});

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatMinutes(value: number | null, t: (s: string) => string) {
  if (value == null) return "—";
  if (value < 60) return `${Math.round(value)} ${t("min")}`;
  return `${(value / 60).toFixed(1)} ${t("h")}`;
}

function TeamReports() {
  const { translate: t } = useTranslation();
  const { range, setRange, from } = useReportDateRange();

  const { data: responseTimes } = useResponseTimesReport(from, null);
  const { data: leaderboard } = useRepLeaderboardReport(from, null);
  const { data: agents } = useCurrentAgents();

  const summary = responseTimes?.[0];
  const assignedCount = summary?.assigned_count ?? 0;
  const respondedCount = summary?.responded_count ?? 0;
  const breachedCount = summary?.breached_count ?? 0;
  const breachRate =
    assignedCount > 0 ? (breachedCount / assignedCount) * 100 : 0;

  const agentName = (id: string) =>
    agents?.find((a) => a.id === id)?.name ?? t("un miembro");

  const rows = [...(leaderboard ?? [])].sort(
    (a, b) =>
      b.leads_converted - a.leads_converted ||
      b.leads_assigned - a.leads_assigned,
  );

  return (
    <SectionBody className="gap-[24px]">
      <ReportDateRangeButtons range={range} onChange={setRange} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[12px]">
        <div className="rounded-xl border border-border p-[12px]">
          <div className="text-[12px] text-muted-foreground">
            {t("Leads asignados")}
          </div>
          <div className="text-[22px] font-medium">{assignedCount}</div>
        </div>
        <div className="rounded-xl border border-border p-[12px]">
          <div className="text-[12px] text-muted-foreground">
            {t("Tiempo de respuesta promedio")}
          </div>
          <div className="text-[22px] font-medium">
            {formatMinutes(summary?.avg_response_minutes ?? null, t)}
          </div>
        </div>
        <div className="rounded-xl border border-border p-[12px]">
          <div className="text-[12px] text-muted-foreground">
            {t("Respondidos")}
          </div>
          <div className="text-[22px] font-medium">{respondedCount}</div>
        </div>
        <div className="rounded-xl border border-border p-[12px]">
          <div className="text-[12px] text-muted-foreground">
            {t("Fuera de plazo")}
          </div>
          <div className="text-[22px] font-medium">
            {breachRate.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[8px]">
        <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
          {t("Tabla de clasificación")}
        </div>
        {rows.length === 0 ? (
          <div className="text-[13px] text-muted-foreground">
            {t("Sin datos")}
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-muted-foreground text-left border-b border-border">
                <th className="py-[6px] font-normal">{t("Miembro")}</th>
                <th className="py-[6px] font-normal text-right">
                  {t("Leads")}
                </th>
                <th className="py-[6px] font-normal text-right">
                  {t("Convertidos")}
                </th>
                <th className="py-[6px] font-normal text-right">
                  {t("Valor ganado")}
                </th>
                <th className="py-[6px] font-normal text-right">
                  {t("Tiempo de respuesta promedio")}
                </th>
                <th className="py-[6px] font-normal text-right">
                  {t("Fuera de plazo")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.agent_id}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-[6px]">{agentName(row.agent_id)}</td>
                  <td className="py-[6px] text-right">{row.leads_assigned}</td>
                  <td className="py-[6px] text-right">{row.leads_converted}</td>
                  <td className="py-[6px] text-right">
                    {formatCurrency(Number(row.deal_value_won))}
                  </td>
                  <td className="py-[6px] text-right">
                    {formatMinutes(row.avg_response_minutes, t)}
                  </td>
                  <td className="py-[6px] text-right">{row.breached_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </SectionBody>
  );
}
