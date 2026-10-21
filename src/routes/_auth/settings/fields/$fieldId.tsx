// [crm] Edit a custom field (P1-06): labels, required, options; archive or
// restore. Archiving hides the field from forms and filters and keeps values.
import { createFileRoute } from "@tanstack/react-router";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import SectionHeader from "@/components/SectionHeader";
import CustomFieldForm from "@/components/CustomFieldForm";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useArchiveCustomField,
  useCustomFields,
  useMyPermissions,
  useUpdateCustomField,
} from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/fields/$fieldId")({
  component: EditField,
});

function EditField() {
  const { translate: t } = useTranslation();
  const { fieldId } = Route.useParams();
  const { data: fields } = useCustomFields();
  const { can } = useMyPermissions();
  const update = useUpdateCustomField();
  const archive = useArchiveCustomField();
  const canManage = can("organization.manage");

  const field = fields?.find((f) => f.id === fieldId);
  if (!field) return null;
  const archived = !!field.definition.archived;

  return (
    <>
      <SectionHeader title={field.definition.label.en} />
      <SectionBody>
        <div className="px-[6px] flex flex-col gap-[12px]">
          {field.fromPack && (
            <p className="text-[13px] text-muted-foreground">
              {t(
                "Campo del pack: tus cambios se conservan cuando el pack se actualiza.",
              )}
            </p>
          )}
          <CustomFieldForm
            // Remount after a save, so the form shows the stored field.
            key={JSON.stringify(field.definition)}
            isNew={false}
            initial={field.definition}
            canManage={canManage}
            saving={update.isPending}
            error={update.error?.message ?? archive.error?.message}
            onSave={(definition) =>
              update.mutate({ id: field.id, ...definition })
            }
          />
        </div>
      </SectionBody>

      {canManage && (
        <SectionFooter>
          <Button
            type="button"
            loading={archive.isPending}
            onClick={() =>
              archive.mutate({ id: field.id, archived: !archived })
            }
          >
            {archived ? t("Restaurar campo") : t("Archivar campo")}
          </Button>
        </SectionFooter>
      )}
    </>
  );
}
