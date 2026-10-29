// [crm] New custom field (P1-06). Entity (contact/deal, P3-07b) is picked
// here, once -- CustomFieldForm itself has no entity field, since it never
// changes once created (same bar as key/type).
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import CustomFieldForm from "@/components/CustomFieldForm";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type FieldDefinition,
  useCreateCustomField,
  useMyPermissions,
} from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/fields/new")({
  component: NewField,
});

function NewField() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { can } = useMyPermissions();
  const create = useCreateCustomField();
  const [entity, setEntity] = useState<FieldDefinition["entity"]>("contact");

  return (
    <>
      <SectionHeader title={t("Nuevo campo")} />
      <SectionBody>
        <div className="px-[6px] flex flex-col gap-[16px]">
          <label>
            <div className="label">{t("Se aplica a")}</div>
            <select
              className="text"
              value={entity}
              onChange={(e) =>
                setEntity(e.target.value as FieldDefinition["entity"])
              }
            >
              <option value="contact">{t("Contactos")}</option>
              <option value="deal">{t("Oportunidades")}</option>
            </select>
          </label>
          <CustomFieldForm
            // Remount on entity change -- CustomFieldForm only reads
            // `initial` once (useState), and entity never changes after.
            key={entity}
            isNew
            initial={{
              key: "",
              entity,
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
