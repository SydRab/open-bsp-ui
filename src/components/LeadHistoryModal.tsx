// [crm] P3-07c: a lead's own history timeline, reusing describeAction/
// describeActor (src/utils/auditLog.ts, the Activity page's own
// formatter) rather than inventing a second one for the same data.
import { X } from "lucide-react";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { useLeadHistory } from "@/queries/useCrm";
import { describeAction, describeActor } from "@/utils/auditLog";

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

  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

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
          {isLoading && (
            <div className="flex justify-center p-[16px]">
              <Spinner size={20} />
            </div>
          )}
          {error && (
            <div className="text-destructive text-[13px]">{error.message}</div>
          )}
          {!isLoading && !error && (entries ?? []).length === 0 && (
            <div className="text-[13px] text-muted-foreground">
              {t("Sin actividad todavía.")}
            </div>
          )}
          {(entries ?? []).map((entry) => (
            <div key={entry.id} className="text-[13px]">
              <div className="text-foreground">
                {describeAction(entry, t, lookups)}
              </div>
              <div className="text-muted-foreground">
                {describeActor(entry, t)} · {formatTime(entry.created_at)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
