// [crm] P3-07c: a lead's own history timeline, reusing describeAction/
// describeActor (src/utils/auditLog.ts, the Activity page's own
// formatter) rather than inventing a second one for the same data. The
// entry-list rendering itself moved into AuditEntryList (P3-11a), its
// first second caller.
import { X } from "lucide-react";
import AuditEntryList from "@/components/AuditEntryList";
import { useTranslation } from "@/hooks/useTranslation";
import { useLeadHistory } from "@/queries/useCrm";

export default function LeadHistoryModal({
  leadId,
  stageNames,
  qualityNames,
  agentNames,
  onClose,
}: {
  leadId: string;
  stageNames: Map<string, string>;
  qualityNames: Map<string, string>;
  agentNames: Map<string, string>;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const { data: entries, isLoading, error } = useLeadHistory(leadId);

  const lookups = {
    roleNames: new Map<string, string>(),
    permissionNames: new Map<string, string>(),
    settingNames: new Map<string, string>(),
    featureNames: new Map<string, string>(),
    stageNames,
    qualityNames,
    agentNames,
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-background text-foreground rounded-xl w-[400px] max-h-[70vh] p-[20px] flex flex-col gap-[12px]">
        <div className="flex items-center justify-between shrink-0">
          <div className="text-[16px] font-medium">{t("Historial")}</div>
          <button
            className="p-[4px] rounded-full hover:bg-muted"
            onClick={onClose}
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-[10px]">
          <AuditEntryList
            entries={entries}
            isLoading={isLoading}
            error={error}
            lookups={lookups}
          />
        </div>
      </div>
    </div>
  );
}
