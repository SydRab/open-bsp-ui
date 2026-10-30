// [crm] Editor for one setting (P1-04), chosen from its schema:
//   boolean                        → a switch, saved at once;
//   object of booleans             → a switch per field, saved at once;
//   object of times / whole numbers → fields + Save;
//   list of strings                → one entry per line + Save.
// The database validates every value; its message is shown by the page.
import { useState } from "react";
import Switch from "@/components/Switch";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import type { SettingRow, SettingSchema } from "@/queries/useCrm";
import {
  SETTING_FIELD_LABELS as FIELD_LABELS,
  orderedFields,
} from "@/utils/settings";

/** The schema's fields in display order (its `required` list). */
function fieldsOf(schema: SettingSchema) {
  return orderedFields(Object.keys(schema.properties ?? {}), schema.required);
}

type Props = {
  setting: SettingRow;
  disabled: boolean;
  saving: boolean;
  onSave: (value: unknown) => void;
};

function isBooleanObject(schema: SettingSchema) {
  const props = Object.values(schema.properties ?? {});
  return props.length > 0 && props.every((p) => p.type === "boolean");
}

export default function SettingEditor(props: Props) {
  const { schema } = props.setting;

  if (schema.type === "boolean") return <BooleanEditor {...props} />;
  if (schema.type === "object" && isBooleanObject(schema)) {
    return <BooleanObjectEditor {...props} />;
  }
  if (schema.type === "object") return <FieldsEditor {...props} />;
  if (schema.type === "array") return <ListEditor {...props} />;
  return (
    <pre className="text-[13px] text-muted-foreground">
      {JSON.stringify(props.setting.value)}
    </pre>
  );
}

function BooleanEditor({ setting, disabled, saving, onSave }: Props) {
  return (
    <Switch
      checked={setting.value === true}
      disabled={disabled || saving}
      onCheckedChange={(checked) => onSave(checked)}
    />
  );
}

function BooleanObjectEditor({ setting, disabled, saving, onSave }: Props) {
  const { translate: t } = useTranslation();
  const value = (setting.value ?? {}) as Record<string, boolean>;

  return (
    <div className="flex flex-col gap-[6px] w-full">
      {fieldsOf(setting.schema).map((field) => (
        <label
          key={field}
          className="flex items-center justify-between gap-[16px] py-[2px]"
        >
          <span className="text-[14px]">{t(FIELD_LABELS[field] ?? field)}</span>
          <Switch
            checked={value[field] === true}
            disabled={disabled || saving}
            onCheckedChange={(checked) =>
              onSave({ ...value, [field]: checked })
            }
          />
        </label>
      ))}
    </div>
  );
}

function FieldsEditor({ setting, disabled, saving, onSave }: Props) {
  const { translate: t } = useTranslation();
  const initial = (setting.value ?? {}) as Record<
    string,
    string | number | string[]
  >;
  const [draft, setDraft] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  return (
    <div className="flex flex-col gap-[8px] w-full">
      <div className="flex flex-wrap gap-[12px]">
        {fieldsOf(setting.schema).map((field) => {
          const fieldSchema = setting.schema.properties?.[field] ?? {};
          const isNumber =
            fieldSchema.type === "integer" || fieldSchema.type === "number";
          // [crm] P3-08: trial.schedule's days/times fields -- same
          // comma-separated convention as ListEditor's one-per-line, just
          // inline since these are nested inside an object, not the
          // setting's own top-level value.
          const isArray = fieldSchema.type === "array";
          const value = draft[field];
          return (
            <label key={field} className="flex flex-col gap-[4px]">
              <span className="label">{t(FIELD_LABELS[field] ?? field)}</span>
              <input
                className="text w-[140px]"
                type={isNumber ? "number" : isArray ? "text" : "time"}
                min={fieldSchema.minimum}
                max={fieldSchema.maximum}
                disabled={disabled}
                value={
                  isArray
                    ? ((value as string[] | undefined) ?? []).join(", ")
                    : ((value as string | number | undefined) ?? "")
                }
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    [field]: isNumber
                      ? Number(e.target.value)
                      : isArray
                        ? e.target.value
                            .split(",")
                            .map((v) => v.trim())
                            .filter(Boolean)
                        : e.target.value,
                  })
                }
              />
            </label>
          );
        })}
      </div>
      {!disabled && dirty && (
        <div>
          <Button type="button" loading={saving} onClick={() => onSave(draft)}>
            {t("Guardar")}
          </Button>
        </div>
      )}
    </div>
  );
}

function ListEditor({ setting, disabled, saving, onSave }: Props) {
  const { translate: t } = useTranslation();
  const initial = ((setting.value ?? []) as string[]).join("\n");
  const [draft, setDraft] = useState(initial);
  const required = setting.schema.mustContain ?? [];

  return (
    <div className="flex flex-col gap-[8px] w-full">
      <textarea
        className="text min-h-[96px]"
        disabled={disabled}
        value={draft}
        placeholder={t("Una por línea")}
        onChange={(e) => setDraft(e.target.value)}
      />
      {required.length > 0 && (
        <div className="text-[12px] text-muted-foreground">
          {t("Siempre incluidas:")} {required.join(", ")}
        </div>
      )}
      {!disabled && draft !== initial && (
        <div>
          <Button
            type="button"
            loading={saving}
            onClick={() =>
              onSave(
                draft
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean),
              )
            }
          >
            {t("Guardar")}
          </Button>
        </div>
      )}
    </div>
  );
}
