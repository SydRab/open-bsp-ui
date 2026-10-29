// [crm] P3-07b: admin config for one stage's required deal-entity fields
// (crm.set_stage_required_fields) -- a plain checkbox list, replace-all on
// save. Distinct from LeadRequiredFieldsModal, which fills in VALUES for
// an end user moving one lead; this one edits the RULE itself.
import { useState } from "react";
import { X } from "lucide-react";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useCustomFields, useSetStageRequiredFields } from "@/queries/useCrm";

export default function StageRequiredFieldsModal({
  stageId,
  stageName,
  requiredFieldIds,
  onClose,
}: {
  stageId: string;
  stageName: string;
  requiredFieldIds: string[];
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const { data: fields } = useCustomFields();
  const save = useSetStageRequiredFields();
  const [checked, setChecked] = useState<Set<string>>(
    new Set(requiredFieldIds),
  );

  const dealFields = (fields ?? []).filter(
    (f) => f.definition.entity === "deal" && !f.definition.archived,
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-background text-foreground rounded-xl w-[360px] p-[20px] flex flex-col gap-[16px]">
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-medium">
            {t("Campos requeridos")} — {stageName}
          </div>
          <button
            className="p-[4px] rounded-full hover:bg-muted"
            onClick={onClose}
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        {dealFields.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">
            {t(
              "Todavía no hay campos de oportunidades para elegir -- créalos en Campos personalizados.",
            )}
          </p>
        ) : (
          <div className="flex flex-col gap-[8px]">
            {dealFields.map((f) => (
              <label
                key={f.id}
                className="flex items-center gap-[8px] text-[14px]"
              >
                <input
                  type="checkbox"
                  checked={checked.has(f.id)}
                  onChange={(e) => {
                    const next = new Set(checked);
                    if (e.target.checked) next.add(f.id);
                    else next.delete(f.id);
                    setChecked(next);
                  }}
                />
                {f.definition.label.en}
              </label>
            ))}
          </div>
        )}

        {save.error && (
          <div className="text-destructive text-[13px]">
            {save.error.message}
          </div>
        )}

        <Button
          type="button"
          className="primary"
          loading={save.isPending}
          onClick={() =>
            save.mutate(
              { stageId, fieldIds: [...checked] },
              { onSuccess: onClose },
            )
          }
        >
          {t("Guardar")}
        </Button>
      </div>
    </div>
  );
}
