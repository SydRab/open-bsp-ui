// [crm] New custom field (P1-06).
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import CustomFieldForm from "@/components/CustomFieldForm";
import { useTranslation } from "@/hooks/useTranslation";
import { useCreateCustomField, useMyPermissions } from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/fields/new")({
  component: NewField,
});

function NewField() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { can } = useMyPermissions();
  const create = useCreateCustomField();

  return (
    <>
      <SectionHeader title={t("Nuevo campo")} />
      <SectionBody>
        <div className="px-[6px]">
          <CustomFieldForm
            isNew
            initial={{
              key: "",
              entity: "contact",
              type: "text",
              label: { en: "" },
              required: false,
            }}
            canManage={can("organization.manage")}
            saving={create.isPending}
            error={create.error?.message}
            onSave={(field) =>
              create.mutate(field, {
                onSuccess: () =>
                  navigate({
                    to: "/settings/fields",
                    hash: (prevHash) => prevHash!,
                  }),
              })
            }
          />
        </div>
      </SectionBody>
    </>
  );
}
