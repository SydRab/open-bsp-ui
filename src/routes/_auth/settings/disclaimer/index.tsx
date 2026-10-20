// [crm] Disclaimer (P1-07): the organization's short and full disclaimers in
// English and Hindi, where they are attached, a preview of what senders will
// send (the database's render_with_disclaimer), and the version history.
// Short → WhatsApp messages and broadcasts; full → public pages, receipts,
// the DISCLAIMER reply. Editing needs organization.manage (database-enforced).
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SettingEditor from "@/components/SettingEditor";
import SelectField from "@/components/SelectField";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type Disclaimer,
  useDisclaimerHistory,
  useDisclaimerPreview,
  useDisclaimers,
  useDisclaimerTemplateCount,
  useMyPermissions,
  useSaveDisclaimer,
  useSaveSetting,
  useSettings,
} from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/disclaimer/")({
  component: DisclaimerPage,
});

const LIMITS = { short: 60, full: 1000 } as const;
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी (Hindi)" },
];
const CONTENT_TYPES = [
  { value: "broadcast", label: "Difusión" },
  { value: "digest", label: "Resumen" },
  { value: "ai_message", label: "Mensaje de IA" },
  { value: "payment_confirmation", label: "Confirmación de pago" },
  { value: "receipt", label: "Recibo" },
  { value: "public_page", label: "Página pública" },
];

function DisclaimerPage() {
  const { translate: t } = useTranslation();
  const { can } = useMyPermissions();
  const canManage = can("organization.manage");
  const { data: disclaimers } = useDisclaimers();
  const { data: settings } = useSettings();
  const { data: templateCount } = useDisclaimerTemplateCount();
  const saveSetting = useSaveSetting();

  const attachRules = settings?.find(
    (s) => s.key === "disclaimer.attach_rules",
  );

  return (
    <>
      <SectionHeader title={t("Aviso legal")} />

      <SectionBody className="gap-[24px]">
        <p className="text-[14px] text-muted-foreground px-[6px]">
          {t(
            "El aviso corto va en los mensajes de WhatsApp y las difusiones; el completo, en las páginas públicas, los recibos y la respuesta a DISCLAIMER. Cada cambio guarda una versión nueva.",
          )}
        </p>

        {LANGUAGES.map((language) => (
          <div
            key={language.value}
            className="flex flex-col gap-[12px] px-[6px]"
          >
            <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
              {language.label}
            </div>
            {(["short", "full"] as const).map((kind) => {
              const current = disclaimers?.find(
                (d) => d.kind === kind && d.locale === language.value,
              );
              return (
                <DisclaimerField
                  // Remount on a new version, so the draft starts fresh.
                  key={`${kind}-${language.value}-${current?.version ?? "none"}`}
                  kind={kind}
                  locale={language.value}
                  current={current}
                  canManage={canManage}
                />
              );
            })}
          </div>
        ))}

        {templateCount !== undefined && templateCount > 0 && (
          <div className="mx-[6px] rounded-lg bg-accent p-[12px] text-[13px]">
            {t(
              "{count} plantillas del pack llevan el aviso corto como pie. Cuando Meta las apruebe (fase 2), cambiar el aviso corto exigirá volver a enviarlas a aprobación.",
            ).replace("{count}", String(templateCount))}
          </div>
        )}

        {attachRules && (
          <div className="flex flex-col gap-[8px] px-[6px]">
            <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
              {t("Adjuntar el aviso a")}
            </div>
            <SettingEditor
              setting={attachRules}
              disabled={!attachRules.can_edit}
              saving={saveSetting.isPending}
              onSave={(value) =>
                saveSetting.mutate({ key: attachRules.key, value })
              }
            />
            <div className="text-[12px] text-muted-foreground">
              {t(
                "Las páginas públicas y la respuesta a DISCLAIMER siempre llevan el aviso completo.",
              )}
            </div>
          </div>
        )}

        <Preview />
        <History />
      </SectionBody>
    </>
  );
}

function DisclaimerField({
  kind,
  locale,
  current,
  canManage,
}: {
  kind: "short" | "full";
  locale: string;
  current: Disclaimer | undefined;
  canManage: boolean;
}) {
  const { translate: t } = useTranslation();
  const save = useSaveDisclaimer();
  const [draft, setDraft] = useState(current?.text ?? "");
  const limit = LIMITS[kind];
  const length = draft.trim().length;
  const dirty = draft.trim() !== (current?.text ?? "").trim();

  const source =
    current?.source === "tenant"
      ? t("Versión {n}").replace("{n}", String(current.version))
      : current?.source === "pack"
        ? t("Del pack")
        : t("Sin aviso");

  return (
    <div
      className="flex flex-col gap-[6px]"
      data-disclaimer={`${kind}-${locale}`}
    >
      <div className="flex items-center justify-between">
        <span className="label">
          {kind === "short" ? t("Aviso corto") : t("Aviso completo")}
        </span>
        <span
          className={
            "text-[12px] " +
            (length > limit ? "text-destructive" : "text-muted-foreground")
          }
        >
          {length}/{limit}
        </span>
      </div>
      {kind === "short" ? (
        <input
          className="text"
          disabled={!canManage}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      ) : (
        <textarea
          className="text min-h-[120px]"
          disabled={!canManage}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      )}
      <div className="flex items-center gap-[8px] text-[12px] text-muted-foreground">
        <span className="rounded-full bg-accent px-[8px] py-[1px]">
          {source}
        </span>
      </div>
      {save.error && (
        <div className="text-destructive text-[13px]">{save.error.message}</div>
      )}
      {canManage && dirty && (
        <div>
          <Button
            type="button"
            loading={save.isPending}
            onClick={() => save.mutate({ kind, locale, text: draft })}
          >
            {t("Guardar versión")}
          </Button>
        </div>
      )}
    </div>
  );
}

function Preview() {
  const { translate: t } = useTranslation();
  const [contentType, setContentType] = useState("broadcast");
  const [locale, setLocale] = useState("en");
  const [text, setText] = useState(
    "Hi Priya, the new batch starts Monday at 7 PM.",
  );
  // Ask the database once typing pauses.
  const [debounced, setDebounced] = useState(text);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(text), 400);
    return () => clearTimeout(id);
  }, [text]);
  const preview = useDisclaimerPreview(contentType, locale, debounced);

  return (
    <div className="flex flex-col gap-[10px] px-[6px]">
      <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
        {t("Vista previa")}
      </div>
      <SelectField
        label={t("Tipo de contenido")}
        value={contentType}
        onChange={setContentType}
        options={CONTENT_TYPES.map((c) => ({
          value: c.value,
          label: t(c.label),
        }))}
      />
      <SelectField
        label={t("Idioma")}
        value={locale}
        onChange={setLocale}
        options={LANGUAGES}
      />
      <label>
        <div className="label">{t("Mensaje de ejemplo")}</div>
        <textarea
          className="text min-h-[60px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      {preview.error && (
        <div className="text-destructive text-[13px]">
          {preview.error.message}
        </div>
      )}
      {preview.data && (
        <div className="flex flex-col gap-[4px]" data-preview>
          <div className="self-start max-w-full rounded-lg bg-accent px-[12px] py-[8px] text-[14px] whitespace-pre-wrap break-words">
            {preview.data.text}
          </div>
          <div className="text-[12px] text-muted-foreground">
            {preview.data.attached
              ? t("Aviso {kind}, versión {n}")
                  .replace(
                    "{kind}",
                    preview.data.disclaimer_kind === "full"
                      ? t("completo")
                      : t("corto"),
                  )
                  .replace("{n}", String(preview.data.disclaimer_version))
              : t("Sin aviso: la regla para este tipo está desactivada.")}
          </div>
        </div>
      )}
    </div>
  );
}

function History() {
  const { translate: t } = useTranslation();
  const { data: versions } = useDisclaimerHistory();

  if (!versions || versions.length === 0) return null;

  return (
    <details className="px-[6px]">
      <summary className="cursor-pointer text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
        {t("Historial de versiones")} ({versions.length})
      </summary>
      <div className="flex flex-col gap-[10px] pt-[10px]">
        {versions.map((v) => (
          <div key={v.id} className="flex flex-col gap-[2px]">
            <div className="text-[12px] text-muted-foreground">
              {v.kind === "short" ? t("Aviso corto") : t("Aviso completo")} ·{" "}
              {v.locale.toUpperCase()} ·{" "}
              {t("Versión {n}").replace("{n}", String(v.version))} ·{" "}
              {new Date(v.created_at).toLocaleString()}
            </div>
            <div className="text-[14px] whitespace-pre-wrap">{v.text}</div>
          </div>
        ))}
      </div>
    </details>
  );
}
