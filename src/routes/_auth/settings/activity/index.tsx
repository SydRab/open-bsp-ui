// [crm] Activity log (P1-08): the organization's audit log, newest first.
// Readable with the audit.view permission (Owner and Admin by default); the
// database enforces it.
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import SelectField from "@/components/SelectField";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgents } from "@/queries/useAgents";
import {
  type AuditFilters,
  useAuditLog,
  useMyPermissions,
  useOrgProfile,
  usePermissionCatalog,
  useRoles,
} from "@/queries/useCrm";
import { AUDIT_AREAS, describeAction, describeActor } from "@/utils/auditLog";

export const Route = createFileRoute("/_auth/settings/activity/")({
  component: ActivityLog,
});

function ActivityLog() {
  const { translate: t } = useTranslation();
  const { can, isLoading: permissionsLoading } = useMyPermissions();
  const [filters, setFilters] = useState<AuditFilters>({
    area: "",
    actor: "",
    days: "30",
  });

  const { data: profile } = useOrgProfile();
  const { data: roles } = useRoles();
  const { data: catalog } = usePermissionCatalog();
  const { data: agents } = useCurrentAgents();
  const log = useAuditLog(filters, can("audit.view"));

  const lookups = {
    roleNames: new Map(roles?.map((r) => [r.key, r.name])),
    permissionNames: new Map(catalog?.map((p) => [p.key, p.description])),
  };

  // Shown in the organization's time zone, like everything scheduled.
  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      ...(profile?.timezone && { timeZone: profile.timezone }),
    }).format(new Date(iso));

  const entries = log.data?.pages.flat() ?? [];
  const people = (agents ?? []).filter((a) => a.user_id !== null);

  if (!permissionsLoading && !can("audit.view")) {
    return (
      <>
        <SectionHeader title={t("Registro de actividad")} />
        <SectionBody>
          <div className="p-[16px] text-muted-foreground">
            {t("No tienes permiso para ver el registro de actividad.")}
          </div>
        </SectionBody>
      </>
    );
  }

  return (
    <>
      <SectionHeader title={t("Registro de actividad")} />

      <SectionBody>
        <div className="flex flex-col gap-[12px] px-[6px] pb-[8px]">
          <SelectField
            label={t("Área")}
            value={filters.area}
            onChange={(area) => setFilters({ ...filters, area })}
            options={[
              { value: "", label: t("Todas") },
              ...AUDIT_AREAS.map((a) => ({
                value: a.value,
                label: t(a.label),
              })),
            ]}
          />
          <SelectField
            label={t("Persona")}
            value={filters.actor}
            onChange={(actor) => setFilters({ ...filters, actor })}
            options={[
              { value: "", label: t("Todas") },
              ...people.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
          <SelectField
            label={t("Periodo")}
            value={filters.days}
            onChange={(days) => setFilters({ ...filters, days })}
            options={[
              { value: "7", label: t("Últimos 7 días") },
              { value: "30", label: t("Últimos 30 días") },
              { value: "90", label: t("Últimos 90 días") },
              { value: "", label: t("Todo") },
            ]}
          />
        </div>

        {log.isLoading && (
          <div className="flex justify-center p-[16px]">
            <Spinner size={20} />
          </div>
        )}

        {log.error && (
          <div className="p-[16px] text-destructive">{log.error.message}</div>
        )}

        {!log.isLoading && !log.error && entries.length === 0 && (
          <div className="p-[16px] text-muted-foreground">
            {t("No hay actividad en este periodo.")}
          </div>
        )}

        {entries.map((entry) => (
          <SectionItem
            key={entry.id}
            // An entry is read in full: let long sentences wrap and the row
            // grow past SectionItem's fixed one-line height.
            className="h-auto! min-h-[72px] py-[10px]"
            title={
              <span className="whitespace-normal break-words">
                {describeAction(entry, t, lookups)}
              </span>
            }
            description={`${describeActor(entry, t)} · ${formatTime(entry.created_at)}`}
            aside={
              <div className="p-[8px]">
                <History className="w-[20px] h-[20px] text-muted-foreground" />
              </div>
            }
          />
        ))}
      </SectionBody>

      {log.hasNextPage && (
        <SectionFooter>
          <Button
            type="button"
            loading={log.isFetchingNextPage}
            onClick={() => void log.fetchNextPage()}
          >
            {t("Cargar más")}
          </Button>
        </SectionFooter>
      )}
    </>
  );
}
