// [crm] P3-07b: admin UI for the three lead-pipeline catalogs (P3-02) --
// stages, qualities and drop (lost) reasons -- all backend-only until now.
// One page, three grouped sections, mirroring settings/fields/'s existing
// "contacts vs deals" grouping rather than three separate routes.
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import LeadCatalogSection from "@/components/LeadCatalogSection";
import StageRequiredFieldsModal from "@/components/StageRequiredFieldsModal";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useLeadDropReasonMutations,
  useLeadDropReasons,
  useLeadQualities,
  useLeadQualityMutations,
  useLeadStageMutations,
  useLeadStages,
  useMyPermissions,
  useStageRequiredFields,
} from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/pipeline/")({
  component: PipelineSettings,
});

function PipelineSettings() {
  const { translate: t } = useTranslation();
  const { can } = useMyPermissions();
  const canManage = can("organization.manage");

  const { data: stages } = useLeadStages();
  const { data: qualities } = useLeadQualities();
  const { data: dropReasons } = useLeadDropReasons();
  const { data: requiredByStage } = useStageRequiredFields();

  const stageMutations = useLeadStageMutations();
  const qualityMutations = useLeadQualityMutations();
  const dropReasonMutations = useLeadDropReasonMutations();

  const [editingStage, setEditingStage] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <>
      <SectionHeader title={t("Pipeline")} />

      <SectionBody className="gap-[20px]">
        <LeadCatalogSection
          title="Etapas"
          items={stages ?? []}
          canManage={canManage}
          create={stageMutations.create}
          update={stageMutations.update}
          remove={stageMutations.remove}
          renderExtra={(stage) => (
            <button
              type="button"
              className="p-[4px] text-muted-foreground hover:text-primary shrink-0"
              title={t("Campos requeridos")}
              onClick={() =>
                setEditingStage({ id: stage.id, name: stage.name })
              }
            >
              <ListChecks className="w-[16px] h-[16px]" />
              {(requiredByStage?.get(stage.id)?.length ?? 0) > 0 && (
                <span className="ml-[2px] text-[11px]">
                  {requiredByStage?.get(stage.id)?.length}
                </span>
              )}
            </button>
          )}
        />

        <LeadCatalogSection
          title="Calidad del lead"
          items={qualities ?? []}
          canManage={canManage}
          create={qualityMutations.create}
          update={qualityMutations.update}
          remove={qualityMutations.remove}
        />

        <LeadCatalogSection
          title="Motivos de pérdida"
          items={dropReasons ?? []}
          canManage={canManage}
          create={dropReasonMutations.create}
          update={dropReasonMutations.update}
          remove={dropReasonMutations.remove}
        />
      </SectionBody>

      {editingStage && (
        <StageRequiredFieldsModal
          stageId={editingStage.id}
          stageName={editingStage.name}
          requiredFieldIds={requiredByStage?.get(editingStage.id) ?? []}
          onClose={() => setEditingStage(null)}
        />
      )}
    </>
  );
}
