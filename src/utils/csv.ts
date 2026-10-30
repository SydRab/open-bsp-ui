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

// [crm] P3-11c: a tiny client-side CSV parser for contact import -- the
// mirror of escapeCell above (quoted fields, embedded commas/newlines,
// doubled-quote escaping), not a general RFC4180 library. No `jsr:@std/csv`
// here: that is Deno-only and this runs in the browser.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  // Normalizing \r\n and bare \r to \n first keeps the loop below to one
  // line-ending case, matching how escapeCell only ever emits \r\n or a
  // bare value.
  const normalized = text.replace(/\r\n|\r/g, "\n");

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  // The last row has no trailing newline to flush it.
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  // A fully blank trailing line (trailing newline in the file) parses to a
  // single empty cell -- drop it rather than surfacing a phantom last row.
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
