// [crm] P3-11c: CSV import with consent mapping. A three-step wizard (pick
// file + account -> map columns + attest -> run + show results) over the
// same write paths /contacts/new and the contact page already use -- see
// useImportContacts (src/queries/useCrm.ts) for why no new edge function or
// bulk SQL function was needed.
import { useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import Button from "@/components/Button";
import FieldError from "@/components/FieldError";
import { useTranslation } from "@/hooks/useTranslation";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import {
  type CustomField,
  type ImportContactRow,
  type ImportRowResult,
  IMPORT_MAX_ROWS,
  useCustomFields,
  useImportContacts,
} from "@/queries/useCrm";
import {
  formatPhoneNumber,
  isValidPhoneNumber,
  normalizePhoneNumber,
} from "@/utils/FormatUtils";
import { parseCsv } from "@/utils/csv";
import type {
  OrganizationAddressRow,
  WhatsAppOrganizationAddressExtra,
} from "@/supabase/client";

export const Route = createFileRoute("/_auth/contacts/import")({
  component: ContactsImport,
});

const DEFAULT_OPTED_IN_VALUES = "si,sí,yes,true,1,opted_in";

type ColumnTarget =
  | "ignore"
  | "address"
  | "name"
  | "tags"
  | "consent"
  | `field:${string}`;

function ContactsImport() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: orgAddresses } = useOrganizationsAddresses();
  const { data: customFields } = useCustomFields();
  const importContacts = useImportContacts();

  const accounts = (orgAddresses ?? []).filter(
    (a) => a.service === "whatsapp" || a.service === "whatsapp-web",
  );
  const accountKey = (a: OrganizationAddressRow) => `${a.service}~${a.address}`;
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  const account =
    accounts.find((a) => accountKey(a) === chosenKey) ?? accounts[0];

  const [step, setStep] = useState<"upload" | "map" | "results">("upload");
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [columnTargets, setColumnTargets] = useState<ColumnTarget[]>([]);
  const [optedInValues, setOptedInValues] = useState(DEFAULT_OPTED_IN_VALUES);
  const [blanketOptIn, setBlanketOptIn] = useState(false);
  const [attested, setAttested] = useState(false);

  const [results, setResults] = useState<ImportRowResult[]>([]);

  const contactFields = (customFields ?? []).filter(
    (f: CustomField) =>
      f.definition.entity === "contact" && !f.definition.archived,
  );

  const headers = rawRows[0] ?? [];
  const dataRows = rawRows.slice(1);

  function handleFile(file: File) {
    setFileError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setFileError(t("El archivo está vacío."));
        return;
      }
      if (parsed.length - 1 > IMPORT_MAX_ROWS) {
        setFileError(
          t(
            "Demasiadas filas (máximo {max}). Dividí el archivo e importá en partes.",
          ).replace("{max}", String(IMPORT_MAX_ROWS)),
        );
        return;
      }
      setRawRows(parsed);
      setColumnTargets(parsed[0].map(() => "ignore"));
      setStep("map");
    };
    reader.onerror = () => setFileError(t("No se pudo leer el archivo."));
    reader.readAsText(file);
  }

  const addressColumnIndex = columnTargets.indexOf("address");
  const consentColumnIndex = columnTargets.indexOf("consent");
  const hasConsentColumn = consentColumnIndex !== -1;

  // Every other field target may be used at most once, except "ignore".
  const usedFieldKeys = new Set(
    columnTargets.filter((c) => c.startsWith("field:")),
  );

  const optedInSet = useMemo(
    () =>
      new Set(
        optedInValues
          .split(",")
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean),
      ),
    [optedInValues],
  );

  function buildRows(): { rows: ImportContactRow[]; invalid: number } {
    const rows: ImportContactRow[] = [];
    let invalid = 0;

    for (const cells of dataRows) {
      // A fully blank line (common at the end of a file) is not a row.
      if (cells.every((c) => !c.trim())) continue;

      const rawAddress =
        addressColumnIndex >= 0 ? cells[addressColumnIndex] : "";
      if (!rawAddress?.trim() || !isValidPhoneNumber(rawAddress)) {
        invalid++;
        continue;
      }
      const address = normalizePhoneNumber(rawAddress);

      let display_name: string | undefined;
      const custom_fields: Record<string, unknown> = {};
      const tag_names: string[] = [];
      let mark_opted_in = blanketOptIn;

      columnTargets.forEach((target, colIndex) => {
        const cell = cells[colIndex]?.trim() ?? "";
        if (!cell) return;
        if (target === "name") display_name = cell;
        else if (target === "tags") {
          tag_names.push(
            ...cell
              .split(/[,;]/)
              .map((v) => v.trim())
              .filter(Boolean),
          );
        } else if (target === "consent") {
          mark_opted_in = optedInSet.has(cell.toLowerCase());
        } else if (target.startsWith("field:")) {
          custom_fields[target.slice("field:".length)] = cell;
        }
      });

      rows.push({
        address,
        display_name,
        custom_fields,
        tag_names,
        mark_opted_in,
      });
    }

    return { rows, invalid };
  }

  const preview = buildRows();
  const canSubmit =
    !!account &&
    addressColumnIndex !== -1 &&
    attested &&
    preview.rows.length > 0 &&
    preview.rows.length <= IMPORT_MAX_ROWS &&
    !importContacts.isPending;

  function handleSubmit() {
    if (!account) return;
    setResults([]);
    importContacts.mutate(
      {
        organizationAddress: account.address,
        service: account.service,
        rows: preview.rows,
        onRowDone: (result) =>
          setResults((prev) =>
            [...prev, result].sort((a, b) => a.index - b.index),
          ),
      },
      { onSuccess: () => setStep("results") },
    );
  }

  const created = results.filter((r) => r.status === "created").length;
  const updated = results.filter((r) => r.status === "updated").length;
  const errors = results.filter((r) => r.status === "error");

  return (
    <>
      <SectionHeader title={t("Importar CSV")} />

      <SectionBody>
        {step === "upload" && (
          <div className="flex flex-col gap-[16px] py-[16px]">
            <div className="text-[14px] text-muted-foreground">
              {t(
                "Importá una lista de contactos desde un archivo CSV. En el siguiente paso vas a poder elegir qué columna es cada cosa.",
              )}
            </div>

            <label>
              <div className="label">{t("Cuenta")}</div>
              <select
                className="text"
                value={chosenKey ?? (account ? accountKey(account) : "")}
                onChange={(e) => setChosenKey(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={accountKey(a)} value={accountKey(a)}>
                    {(a.extra as WhatsAppOrganizationAddressExtra | null)
                      ?.verified_name || formatPhoneNumber(a.address)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div className="label">{t("Archivo CSV")}</div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="text"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </label>
            <FieldError error={fileError ?? undefined} />
          </div>
        )}

        {step === "map" && (
          <div className="flex flex-col gap-[16px] py-[16px]">
            <div className="text-[14px] text-muted-foreground">
              {t(
                "{count} filas encontradas. Elegí qué es cada columna.",
              ).replace("{count}", String(dataRows.length))}
            </div>

            <div className="flex flex-col gap-[12px]">
              {headers.map((header, colIndex) => (
                <div key={colIndex} className="flex items-center gap-[12px]">
                  <div className="flex-1 text-[14px] truncate" title={header}>
                    {header ||
                      t("(columna {n})").replace("{n}", String(colIndex + 1))}
                  </div>
                  <select
                    className="text w-[220px]"
                    value={columnTargets[colIndex]}
                    onChange={(e) =>
                      setColumnTargets((prev) =>
                        prev.map((v, i) =>
                          i === colIndex ? (e.target.value as ColumnTarget) : v,
                        ),
                      )
                    }
                  >
                    <option value="ignore">{t("Ignorar")}</option>
                    <option value="address">{t("Teléfono")}</option>
                    <option value="name">{t("Nombre")}</option>
                    <option value="tags">{t("Etiquetas")}</option>
                    <option value="consent">{t("Consentimiento")}</option>
                    {contactFields.map((f) => (
                      <option
                        key={f.key}
                        value={`field:${f.key}`}
                        disabled={
                          usedFieldKeys.has(`field:${f.key}`) &&
                          columnTargets[colIndex] !== `field:${f.key}`
                        }
                      >
                        {f.definition.label.en}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {addressColumnIndex === -1 && (
              <FieldError error={t("Elegí qué columna es el teléfono.")} />
            )}

            {hasConsentColumn && (
              <label>
                <div className="label">
                  {t(
                    'Valores que cuentan como "opted-in" (separados por coma)',
                  )}
                </div>
                <input
                  type="text"
                  className="text"
                  value={optedInValues}
                  onChange={(e) => setOptedInValues(e.target.value)}
                />
              </label>
            )}

            {!hasConsentColumn && (
              <label className="flex items-center gap-[8px]">
                <input
                  type="checkbox"
                  checked={blanketOptIn}
                  onChange={(e) => setBlanketOptIn(e.target.checked)}
                />
                <span className="text-[14px]">
                  {t(
                    "Marcar todos los contactos de este archivo como opted-in (consentimiento otorgado)",
                  )}
                </span>
              </label>
            )}

            <label className="flex items-start gap-[8px] pt-[8px] border-t border-border">
              <input
                type="checkbox"
                className="mt-[2px]"
                checked={attested}
                onChange={(e) => setAttested(e.target.checked)}
              />
              <span className="text-[14px]">
                {t(
                  "Confirmo que esta lista fue obtenida legalmente y que estoy autorizado a contactar a estas personas por WhatsApp.",
                )}
              </span>
            </label>

            <div className="text-[13px] text-muted-foreground">
              {t(
                "{valid} filas listas para importar, {invalid} inválidas (sin teléfono válido).",
              )
                .replace("{valid}", String(preview.rows.length))
                .replace("{invalid}", String(preview.invalid))}
            </div>
          </div>
        )}

        {step === "results" && (
          <div className="flex flex-col gap-[12px] py-[16px]">
            <div className="text-[14px]">
              {t(
                "{created} creados, {updated} actualizados, {errors} con error.",
              )
                .replace("{created}", String(created))
                .replace("{updated}", String(updated))
                .replace("{errors}", String(errors.length))}
            </div>
            {errors.length > 0 && (
              <div className="flex flex-col gap-[4px]">
                {errors.map((r) => (
                  <div key={r.index} className="text-[13px] text-destructive">
                    {t("Fila {n}: {error}")
                      .replace("{n}", String(r.index + 2))
                      .replace("{error}", r.error ?? "")}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SectionBody>

      <SectionFooter>
        {step === "map" && (
          <div className="flex gap-[8px]">
            <Button
              className="secondary flex-1"
              onClick={() => setStep("upload")}
            >
              {t("Atrás")}
            </Button>
            <Button
              className="primary flex-1"
              invalid={!canSubmit}
              loading={importContacts.isPending}
              onClick={handleSubmit}
            >
              {importContacts.isPending
                ? t("Importando {done}/{total}...")
                    .replace("{done}", String(results.length))
                    .replace("{total}", String(preview.rows.length))
                : t("Importar")}
            </Button>
          </div>
        )}
        {step === "results" && (
          <Button
            className="primary"
            onClick={() =>
              navigate({ to: "/contacts", hash: (prevHash) => prevHash! })
            }
          >
            {t("Listo")}
          </Button>
        )}
      </SectionFooter>
    </>
  );
}
