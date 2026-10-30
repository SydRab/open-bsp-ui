// [crm] P3-11a: a contact's activity -- delegates to crm.get_lead_history
// (P3-07c) when a lead exists for this contact (zero duplication: no
// contact.* audit actions exist anywhere, confirmed by research, so
// there is nothing of its own to show beyond what the lead already has).
// Otherwise falls back to the one thing crm.contacts itself always has:
// the first-touch referral (P3-01), if this contact ever carried one.
import AuditEntryList from "@/components/AuditEntryList";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useContactByAddress,
  useLeadHistory,
  useLeadIdForContact,
  useMyPermissions,
} from "@/queries/useCrm";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  ad: "Anuncio",
  post: "Publicación",
};

export default function ContactActivity({
  service,
  address,
}: {
  service: string;
  address: string;
}) {
  const { translate: t } = useTranslation();
  const { can } = useMyPermissions();
  // crm.get_lead_history is gated on deals.edit (P3-07c) -- /contacts is
  // reachable by roles that don't hold it (finance, teacher, marketing),
  // so this must not even attempt the call for them.
  const canSeeLeadHistory = can("deals.edit");
  const { data: contact } = useContactByAddress(service, address);
  const { data: leadId } = useLeadIdForContact(contact?.id ?? null);
  const {
    data: entries,
    isLoading,
    error,
  } = useLeadHistory(canSeeLeadHistory ? (leadId ?? null) : null);

  if (!contact) return null;

  const referral = contact.first_touch_referral as {
    source_type?: string;
    headline?: string;
  } | null;

  const lookups = {
    roleNames: new Map<string, string>(),
    permissionNames: new Map<string, string>(),
    settingNames: new Map<string, string>(),
    featureNames: new Map<string, string>(),
  };

  return (
    <div className="flex flex-col gap-[8px] mt-[16px]">
      <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
        {t("Actividad")}
      </div>

      {referral?.source_type && (
        <div className="text-[13px] text-muted-foreground">
          {t("Llegó desde")}:{" "}
          {t(SOURCE_TYPE_LABELS[referral.source_type] ?? referral.source_type)}
          {referral.headline ? ` — ${referral.headline}` : ""}
        </div>
      )}

      {leadId && canSeeLeadHistory ? (
        <AuditEntryList
          entries={entries}
          isLoading={isLoading}
          error={error}
          lookups={lookups}
        />
      ) : leadId ? (
        <div className="text-[13px] text-muted-foreground">
          {t("No tienes permiso para ver el historial de este lead.")}
        </div>
      ) : (
        <div className="text-[13px] text-muted-foreground">
          {t("Sin lead todavía -- no hay más actividad que mostrar.")}
        </div>
      )}
    </div>
  );
}
