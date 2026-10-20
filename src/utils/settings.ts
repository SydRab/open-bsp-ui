// [crm] Shared labels and formatting for settings values (P1-04): the
// settings screen and the activity log show the same names, in the same
// order. Labels are translation keys.

/** Field name → label, in the order fields are shown. */
export const SETTING_FIELD_LABELS: Record<string, string> = {
  start: "Desde",
  end: "Hasta",
  max_messages: "Máximo de mensajes",
  period_days: "Cada (días)",
  broadcast: "Difusiones",
  digest: "Resúmenes",
  ai_message: "Mensajes de IA",
  receipt: "Recibos",
  payment_confirmation: "Confirmaciones de pago",
};

const FIELD_ORDER = Object.keys(SETTING_FIELD_LABELS);

/**
 * The fields of an object, in display order: the order given (a schema's
 * `required`), else our known order, unknown fields last. jsonb does not keep
 * the order keys were written in, so the stored order is never used.
 */
export function orderedFields(fields: string[], preferred?: string[]) {
  const rank = (field: string) => {
    const order = preferred ?? FIELD_ORDER;
    const i = order.indexOf(field);
    return i === -1 ? order.length : i;
  };
  return [...fields].sort((a, b) => rank(a) - rank(b));
}

/** A setting value in a few words: "✓", "From 21:00, Until 09:00", "STOP, …". */
export function formatSettingValue(
  value: unknown,
  t: (text: string) => string,
): string {
  if (value === true) return "✓";
  if (value === false) return "✗";
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return orderedFields(Object.keys(object))
      .map(
        (field) =>
          `${t(SETTING_FIELD_LABELS[field] ?? field)} ${formatSettingValue(object[field], t)}`,
      )
      .join(", ");
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return "";
}
