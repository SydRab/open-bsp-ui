// [crm] Tells members why an organization disappeared: it is suspended by the
// platform, or an owner asked to delete it. Either way the API hides the
// organization, so this is the only place they learn about it.
import { AlertTriangle } from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "@/hooks/useTranslation";
import { useCancelOrgDeletion, useMyOrgStatuses } from "@/queries/useCrm";

export default function OrgStatusBanner() {
  const { translate: t } = useTranslation();
  const { data: statuses } = useMyOrgStatuses();
  const cancelDeletion = useCancelOrgDeletion();

  if (!statuses?.length) return null;

  return (
    <div role="alert" className="flex flex-col">
      {statuses.map((org) => (
        <div
          key={org.organization_id}
          className="flex items-center gap-[12px] px-[16px] py-[8px] text-[14px] bg-destructive text-white"
        >
          <AlertTriangle className="w-[18px] h-[18px] shrink-0" />
          <div className="grow min-w-0">
            {org.status === "suspended" ? (
              <>
                <strong>{org.name}</strong>{" "}
                {t("está suspendida. Contacta al soporte para reactivarla.")}
                {org.suspended_reason && (
                  <span className="opacity-80"> ({org.suspended_reason})</span>
                )}
              </>
            ) : (
              <>
                <strong>{org.name}</strong> {t("será eliminada el")}{" "}
                {dayjs(org.purge_after).format("D MMM YYYY")}.
              </>
            )}
          </div>
          {org.can_cancel_deletion && (
            <button
              className="shrink-0 underline font-medium disabled:opacity-50"
              disabled={cancelDeletion.isPending}
              onClick={() => cancelDeletion.mutate(org.organization_id)}
            >
              {t("Cancelar eliminación")}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
