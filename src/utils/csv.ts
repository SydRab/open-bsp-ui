// [crm] P3-11b: a tiny client-side CSV encoder for contact export -- no
// new dependency needed (the dataset is one tenant's own contacts, never
// large enough to need a dedicated edge function or a parsing library).
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
      ? String(value)
      : JSON.stringify(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(
  headers: string[],
  rows: Record<string, unknown>[],
  keys: string[],
): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(keys.map((key) => escapeCell(row[key])).join(","));
  }
  return lines.join("\r\n");
}

/** Triggers a browser download of the given text as a file. */
export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
