// [crm] Add or edit a custom field (P1-06). Key, entity and type are chosen
// once; labels (English, Hindi), "required" and options can change later.
// Options are added and archived, never removed (stored values use them).
// The database checks everything again.
import { useState } from "react";
import { Archive, ArchiveRestore, Plus } from "lucide-react";
import Button from "@/components/Button";
import Switch from "@/components/Switch";
import { useTranslation } from "@/hooks/useTranslation";
import type { FieldDefinition, FieldOption, FieldType } from "@/queries/useCrm";

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Texto",
  long_text: "Texto largo",
  number: "Número",
  date: "Fecha",
  boolean: "Sí / no",
  select: "Una opción",
  multi_select: "Varias opciones",
  email: "Correo",
  phone: "Teléfono",
  url: "Sitio web",
};

const CHOICE_TYPES: FieldType[] = ["select", "multi_select"];

// "Capital range" → "capital_range". Field keys start with a letter;
// option values may start with a digit ("50k_2l").
function toKey(text: string, allowLeadingDigit = false) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(allowLeadingDigit ? /^_+/ : /^[0-9_]+/, "")
    .slice(0, 40);
}

export default function CustomFieldForm({
  initial,
  isNew,
  canManage,
  saving,
  error,
  onSave,
}: {
  initial: FieldDefinition;
  isNew: boolean;
  canManage: boolean;
  saving: boolean;
  error?: string;
  onSave: (field: FieldDefinition) => void;
}) {
  const { translate: t } = useTranslation();
  const [field, setField] = useState<FieldDefinition>(initial);
  const [keyTouched, setKeyTouched] = useState(!isNew);
  const savedOptions = new Set((initial.options ?? []).map((o) => o.value));
  const isChoice = CHOICE_TYPES.includes(field.type);
  const options = field.options ?? [];

  const setOption = (index: number, option: FieldOption) =>
    setField({
      ...field,
      options: options.map((o, i) => (i === index ? option : o)),
    });

  return (
    <form
      className="flex flex-col gap-[16px]"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          ...field,
          options: isChoice
            ? options.map((o) => ({
                ...o,
                value: o.value || toKey(o.label.en, true),
                label: o.label.hi?.trim() ? o.label : { en: o.label.en },
              }))
            : undefined,
          label: field.label.hi?.trim() ? field.label : { en: field.label.en },
        });
      }}
    >
      <label>
        <div className="label">{t("Nombre (inglés)")}</div>
        <input
          className="text"
          disabled={!canManage}
          value={field.label.en}
          onChange={(e) =>
            setField({
              ...field,
              label: { ...field.label, en: e.target.value },
              key: keyTouched ? field.key : toKey(e.target.value),
            })
          }
        />
      </label>
      <label>
        <div className="label">{t("Nombre (hindi)")}</div>
        <input
          className="text"
          disabled={!canManage}
          value={field.label.hi ?? ""}
          onChange={(e) =>
            setField({
              ...field,
              label: { ...field.label, hi: e.target.value },
            })
          }
        />
      </label>

      <label>
        <div className="label">{t("Clave")}</div>
        <input
          className="text font-mono"
          disabled={!isNew || !canManage}
          value={field.key}
          onChange={(e) => {
            setKeyTouched(true);
            setField({ ...field, key: e.target.value });
          }}
        />
        {isNew && (
          <div className="text-[12px] text-muted-foreground mt-[4px]">
            {t(
              "Se usa en plantillas, p. ej. {{contact.clave}}. No se puede cambiar después.",
            )}
          </div>
        )}
      </label>

      <label>
        <div className="label">{t("Tipo")}</div>
        <select
          className="text"
          disabled={!isNew || !canManage}
          value={field.type}
          onChange={(e) => {
            const type = e.target.value as FieldType;
            setField({
              ...field,
              type,
              options: CHOICE_TYPES.includes(type)
                ? options.length
                  ? options
                  : [{ value: "", label: { en: "" } }]
                : undefined,
            });
          }}
        >
          {Object.entries(FIELD_TYPE_LABELS).map(([type, label]) => (
            <option key={type} value={type}>
              {t(label)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center justify-between gap-[16px]">
        <span className="text-[15px]">
          {t("Obligatorio al guardar el contacto")}
        </span>
        <Switch
          checked={!!field.required}
          disabled={!canManage}
          onCheckedChange={(required) => setField({ ...field, required })}
        />
      </label>

      {isChoice && (
        <div className="flex flex-col gap-[8px]">
          <div className="label">{t("Opciones")}</div>
          {options.map((o, index) => (
            <div
              key={index}
              className={
                "flex items-center gap-[8px] " +
                (o.archived ? "opacity-50" : "")
              }
            >
              <input
                className="text grow"
                placeholder={t("Opción (inglés)")}
                disabled={!canManage}
                value={o.label.en}
                onChange={(e) =>
                  setOption(index, {
                    ...o,
                    label: { ...o.label, en: e.target.value },
                  })
                }
              />
              <input
                className="text grow"
                placeholder={t("Opción (hindi)")}
                disabled={!canManage}
                value={o.label.hi ?? ""}
                onChange={(e) =>
                  setOption(index, {
                    ...o,
                    label: { ...o.label, hi: e.target.value },
                  })
                }
              />
              {canManage &&
                (savedOptions.has(o.value) ? (
                  <button
                    type="button"
                    className="cursor-pointer text-muted-foreground"
                    title={o.archived ? t("Restaurar") : t("Archivar")}
                    onClick={() =>
                      setOption(index, { ...o, archived: !o.archived })
                    }
                  >
                    {o.archived ? (
                      <ArchiveRestore className="w-[18px] h-[18px]" />
                    ) : (
                      <Archive className="w-[18px] h-[18px]" />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="cursor-pointer text-muted-foreground text-[18px] leading-none"
                    title={t("Quitar")}
                    onClick={() =>
                      setField({
                        ...field,
                        options: options.filter((_, i) => i !== index),
                      })
                    }
                  >
                    ×
                  </button>
                ))}
            </div>
          ))}
          {canManage && (
            <button
              type="button"
              className="flex items-center gap-[6px] text-primary font-bold cursor-pointer self-start"
              onClick={() =>
                setField({
                  ...field,
                  options: [...options, { value: "", label: { en: "" } }],
                })
              }
            >
              <Plus className="w-[16px] h-[16px]" />
              {t("Añadir opción")}
            </button>
          )}
        </div>
      )}

      {error && <div className="text-destructive text-[13px]">{error}</div>}

      {canManage && (
        <div>
          <Button type="submit" className="primary" loading={saving}>
            {isNew ? t("Crear campo") : t("Guardar campo")}
          </Button>
        </div>
      )}
    </form>
  );
}
