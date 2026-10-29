// [crm] P3-07b: shown when a drag move onto a stage is missing one or more
// of that stage's required deal-entity fields (crm.lead_stage_required_
// fields) -- fills them in via crm.set_lead_fields, then retries the move.
// Mirrors MfaStepUpModal's fixed-overlay shape, the one existing modal
// pattern in this app.
import { useState } from "react";
import { X } from "lucide-react";
import Button from "@/components/Button";
import CustomFieldInput from "@/components/CustomFieldInput";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useCustomFields,
  useSaveLeadFields,
  useSetLeadStage,
} from "@/queries/useCrm";

export default function LeadRequiredFieldsModal({
  leadId,
  stageId,
  missingFieldIds,
  currentValues,
  onClose,
  onDone,
}: {
  leadId: string;
  stageId: string | null;
  missingFieldIds: string[];
  currentValues: Record<string, unknown>;
  onClose: () => void;
  onDone: () => void;
}) {
  const { translate: t } = useTranslation();
  const { data: fields } = useCustomFields();
  const saveFields = useSaveLeadFields();
  const setStage = useSetLeadStage();
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  const missing = (fields ?? []).filter((f) => missingFieldIds.includes(f.id));
  const pending = saveFields.isPending || setStage.isPending;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-background text-foreground rounded-xl w-[360px] p-[20px] flex flex-col gap-[16px]">
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-medium">
            {t("Faltan campos obligatorios")}
          </div>
          <button
            className="p-[4px] rounded-full hover:bg-muted"
            onClick={onClose}
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <p className="text-[14px] text-muted-foreground">
          {t("Esta etapa exige completar estos campos antes de mover el lead.")}
        </p>

        <form
          className="flex flex-col gap-[14px]"
          onSubmit={(e) => {
            e.preventDefault();
            saveFields.mutate(
              { leadId, values: draft },
              {
                onSuccess: () =>
                  setStage.mutate({ leadId, stageId }, { onSuccess: onDone }),
              },
            );
          }}
        >
          {missing.map((f) => (
            <CustomFieldInput
              key={f.key}
              definition={f.definition}
              value={draft[f.key] ?? currentValues[f.key]}
              stored={currentValues[f.key]}
              disabled={pending}
              onChange={(value) => setDraft({ ...draft, [f.key]: value })}
            />
          ))}

          {(saveFields.error || setStage.error) && (
            <div className="text-destructive text-[13px]">
              {(saveFields.error ?? setStage.error)?.message}
            </div>
          )}

          <Button type="submit" className="primary" loading={pending}>
            {t("Guardar y mover")}
          </Button>
        </form>
      </div>
    </div>
  );
}
