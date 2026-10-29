// [crm] P3-06: the "unanswered leads" triage view named explicitly in the
// roadmap line -- a small overdue-first list, not the kanban pipeline
// board (that's P3-07, a separate task, which is why this lives at
// /leads/unanswered rather than /leads).
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import Avatar from "@/components/Avatar";
import { useTranslation } from "@/hooks/useTranslation";
import { useUnansweredLeads } from "@/queries/useCrm";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Clock } from "lucide-react";

export const Route = createFileRoute("/_auth/leads/unanswered")({
  component: UnansweredLeads,
});

function overdueBy(dueAt: string | null, t: (s: string) => string): string {
  if (!dueAt) return "";
  const minutes = Math.round((Date.now() - new Date(dueAt).getTime()) / 60_000);
  if (minutes <= 0) {
    return t("Vence en") + ` ${Math.abs(minutes)}m`;
  }
  if (minutes < 60) return t("Vencido hace") + ` ${minutes}m`;
  return t("Vencido hace") + ` ${Math.round(minutes / 60)}h`;
}

function UnansweredLeads() {
  const { translate: t } = useTranslation();
  const { data: leads } = useUnansweredLeads();

  return (
    <>
      <SectionHeader title={t("Leads sin respuesta")} />

      <SectionBody>
        {(leads ?? []).length === 0 && (
          <div className="py-[32px] text-center text-muted-foreground text-[14px]">
            {t("No hay leads sin respuesta")}
          </div>
        )}
        {(leads ?? []).map((lead) => {
          const isOverdue =
            !!lead.first_response_due_at &&
            new Date(lead.first_response_due_at).getTime() < Date.now();

          return (
            <SectionItem
              key={lead.id}
              title={lead.contactName || t("Sin nombre")}
              description={
                <span className="flex items-center gap-[4px]">
                  {isOverdue ? (
                    <AlertTriangle className="w-[14px] h-[14px] text-destructive shrink-0" />
                  ) : (
                    <Clock className="w-[14px] h-[14px] text-muted-foreground shrink-0" />
                  )}
                  {(lead.assigneeName
                    ? `${t("Asignado a")} ${lead.assigneeName} · `
                    : "") + overdueBy(lead.first_response_due_at, t)}
                </span>
              }
              aside={
                <Avatar
                  fallback={(lead.contactName || "?").charAt(0).toUpperCase()}
                  size={40}
                  className={
                    isOverdue
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }
                />
              }
              className={isOverdue ? "bg-destructive/5" : ""}
            />
          );
        })}
      </SectionBody>
    </>
  );
}
