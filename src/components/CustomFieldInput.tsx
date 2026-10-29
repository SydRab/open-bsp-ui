// [crm] One input per custom field type (P1-06), extracted from
// ContactFieldsForm so the same renderer works for deal-entity fields
// (P3-07b) without duplicating the type switch.
import { useTranslation } from "@/hooks/useTranslation";
import Switch from "@/components/Switch";
import type { FieldDefinition } from "@/queries/useCrm";

export default function CustomFieldInput({
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
