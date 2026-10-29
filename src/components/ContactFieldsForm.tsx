// [crm] A contact's custom fields (P1-06), on the contact page. One input per
// field type (CustomFieldInput, shared with the lead-fields form, P3-07b);
// Save sends only what changed through crm.set_contact_fields, which
// enforces required fields. Archived fields show their stored value
// read-only; archived options stay selectable only where already chosen.
import { useState } from "react";
import Button from "@/components/Button";
import CustomFieldInput from "@/components/CustomFieldInput";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type CrmContact,
  type CustomField,
  useContactByAddress,
  useCustomFields,
  useMyPermissions,
  useSaveContactFields,
} from "@/queries/useCrm";

type Values = Record<string, unknown>;

export default function ContactFieldsForm({
  service,
  address,
}: {
  service: string;
  address: string;
}) {
  const { translate: t } = useTranslation();
  const { data: contact } = useContactByAddress(service, address);
  const { data: fields } = useCustomFields();

  if (!contact || !fields) return null;

  const contactFields = fields.filter(
    (f) =>
      f.definition.entity === "contact" &&
      (!f.definition.archived || contact.custom_fields[f.key] !== undefined),
  );
  if (contactFields.length === 0) return null;

  return (
    <div className="flex flex-col gap-[12px] pt-[24px] pl-[10px]">
      <div className="text-[16px] text-muted-foreground">{t("Detalles")}</div>
      <FieldsEditor
        // Remount when the saved values change, so the draft starts fresh.
        key={JSON.stringify(contact.custom_fields)}
        contact={contact}
        fields={contactFields}
      />
    </div>
  );
}

function FieldsEditor({
  contact,
  fields,
}: {
  contact: CrmContact;
  fields: CustomField[];
}) {
  const { translate: t } = useTranslation();
  const { can } = useMyPermissions();
  const save = useSaveContactFields();
  const [draft, setDraft] = useState<Values>(contact.custom_fields);
  const canEdit = can("contacts.edit");

  const changed: Values = {};
  for (const f of fields) {
    const before = contact.custom_fields[f.key];
    const after = draft[f.key];
    if (JSON.stringify(before ?? null) !== JSON.stringify(after ?? null)) {
      changed[f.key] = after ?? null;
    }
  }
  const dirty = Object.keys(changed).length > 0;

  return (
    <div className="flex flex-col gap-[14px]" data-contact-fields>
      {fields.map((f) => (
        <CustomFieldInput
          key={f.key}
          definition={f.definition}
          value={draft[f.key]}
          stored={contact.custom_fields[f.key]}
          disabled={!canEdit || !!f.definition.archived}
          onChange={(value) => setDraft({ ...draft, [f.key]: value })}
        />
      ))}

      {save.error && (
        <div className="text-destructive text-[13px]">{save.error.message}</div>
      )}

      {canEdit && dirty && (
        <div>
          <Button
            type="button"
            className="primary"
            loading={save.isPending}
            onClick={() => save.mutate({ id: contact.id, values: changed })}
          >
            {t("Guardar detalles")}
          </Button>
        </div>
      )}
    </div>
  );
}
