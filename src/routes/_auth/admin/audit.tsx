// [crm] Super-admin console (P1-10): crm.platform_audit_log, newest first —
// every cross-tenant action any platform admin has taken. Append-only; the
// database refuses update/delete/truncate unconditionally (unlike the
// per-tenant audit log, which allows one exception for purge).
import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePlatformAuditLog } from "@/queries/useAdmin";

export const Route = createFileRoute("/_auth/admin/audit")({
  component: PlatformAuditLog,
});

const ACTION_LABELS: Record<string, string> = {
  "organization.suspended": "Organización suspendida",
  "organization.reactivated": "Organización reactivada",
  "organization.tier_changed": "Plan cambiado",
  "organization.pack_upgraded": "Paquete actualizado",
  "feature.override_set": "Función forzada para una organización",
  "feature.override_cleared": "Anulación de función eliminada",
  "feature.kill_switch_changed": "Interruptor de función cambiado",
  "platform_admin.granted": "Acceso de administrador otorgado",
  "platform_admin.revoked": "Acceso de administrador revocado",
  "support_access.granted": "Acceso de soporte otorgado",
  "support_access.revoked": "Acceso de soporte revocado",
};

function PlatformAuditLog() {
  const { translate: t } = useTranslation();
  const { data: entries, isLoading, error } = usePlatformAuditLog();

  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  return (
    <>
      <SectionHeader title={t("Registro de actividad de la plataforma")} />

      <SectionBody>
        {isLoading && (
          <div className="flex justify-center p-[16px]">
            <Spinner size={20} />
          </div>
        )}

        {error && (
          <div className="p-[16px] text-destructive">{error.message}</div>
        )}

        {!isLoading && !error && entries?.length === 0 && (
          <div className="p-[16px] text-muted-foreground">
            {t("No hay actividad registrada.")}
          </div>
        )}

        {entries?.map((entry) => (
          <SectionItem
            key={entry.id}
            className="h-auto! min-h-[72px] py-[10px]"
            title={
              <span className="whitespace-normal break-words">
                {t(ACTION_LABELS[entry.action] ?? entry.action)}
                {entry.target_id && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {entry.target_type} {entry.target_id}
                  </span>
                )}
              </span>
            }
            description={`${entry.actor_email} · ${formatTime(entry.created_at)}`}
            aside={
              <div className="p-[8px]">
                <History className="w-[20px] h-[20px] text-muted-foreground" />
              </div>
            }
          />
        ))}
      </SectionBody>
    </>
  );
}
