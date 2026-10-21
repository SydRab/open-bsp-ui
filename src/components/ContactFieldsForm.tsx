// [crm] A contact's custom fields (P1-06), on the contact page. One input per
// field type; Save sends only what changed through crm.set_contact_fields,
// which enforces required fields. Archived fields show their stored value
// read-only; archived options stay selectable only where already chosen.
import { useState } from "react";
import Button from "@/components/Button";
import Switch from "@/components/Switch";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type CrmContact,
  type CustomField,
  type FieldDefinition,
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
        <FieldInput
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

function FieldInput({
  definition: d,
  value,
  stored,
  disabled,
  onChange,
}: {
  definition: FieldDefinition;
  value: unknown;
  stored: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const { translate: t } = useTranslation();
  const label = (
    <div className="label">
      {d.label.en}
      {d.required ? " *" : ""}
      {d.archived ? ` (${t("archivado")})` : ""}
    </div>
  );
  // Archived options only where already stored.
  const options = (d.options ?? []).filter(
    (o) =>
      !o.archived ||
      stored === o.value ||
      (Array.isArray(stored) && stored.includes(o.value)),
  );
  const text =
    typeof value === "string" || typeof value === "number" ? value : "";

  switch (d.type) {
    case "boolean":
      return (
        <label className="flex items-center justify-between gap-[16px]">
          {label}
          <Switch
            checked={value === true}
            disabled={disabled}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </label>
      );
    case "select":
      return (
        <label>
          {label}
          <select
            className="text"
            disabled={disabled}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value || null)}
          >
            <option value="">—</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label.en}
              </option>
            ))}
          </select>
        </label>
      );
    case "multi_select": {
      const chosen = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-col gap-[4px]">
          {label}
          {options.map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-[8px] text-[14px]"
            >
              <input
                type="checkbox"
                disabled={disabled}
                checked={chosen.includes(o.value)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...chosen, o.value]
                      : chosen.filter((c) => c !== o.value),
                  )
                }
              />
              {o.label.en}
            </label>
          ))}
        </div>
      );
    }
    case "long_text":
      return (
        <label>
          {label}
          <textarea
            className="text min-h-[80px]"
            disabled={disabled}
            value={text}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      );
    case "number":
      return (
        <label>
          {label}
          <input
            className="text"
            type="number"
            disabled={disabled}
            value={text}
            onChange={(e) =>
              onChange(e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </label>
      );
    default:
      return (
        <label>
          {label}
          <input
            className="text"
            type={
              d.type === "date"
                ? "date"
                : d.type === "email"
                  ? "email"
                  : d.type === "phone"
                    ? "tel"
                    : d.type === "url"
                      ? "url"
                      : "text"
            }
            disabled={disabled}
            value={text}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      );
  }
}
