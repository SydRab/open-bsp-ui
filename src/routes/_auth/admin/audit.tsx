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
  "organization.suspended": "Organization suspended",
  "organization.reactivated": "Organization reactivated",
  "organization.tier_changed": "Plan changed",
  "organization.pack_upgraded": "Pack upgraded",
  "feature.override_set": "Feature forced for an organization",
  "feature.override_cleared": "Feature override removed",
  "feature.kill_switch_changed": "Feature kill switch changed",
  "platform_admin.granted": "Admin access granted",
  "platform_admin.revoked": "Admin access revoked",
  "support_access.granted": "Support access granted",
  "support_access.revoked": "Support access revoked",
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
      <SectionHeader title={t("Platform activity log")} />

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
            {t("No activity recorded yet.")}
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
