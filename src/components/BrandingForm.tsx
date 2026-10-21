// [crm] Branding tokens (P1-11): logo URL and primary color, through the
// settings engine (crm.setting_definitions, category "branding") rather than
// a dedicated table — same resolver, validation, audit and permissions as
// every other setting. Applied live by BrandingProvider.
import { useState, type ReactNode } from "react";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { type SettingRow, useSaveSetting, useSettings } from "@/queries/useCrm";

export default function BrandingForm() {
  const { translate: t } = useTranslation();
  const { data: settings } = useSettings();
  const save = useSaveSetting();

  const logo = settings?.find((s) => s.key === "branding.logo_url");
  const color = settings?.find((s) => s.key === "branding.primary_color");

  if (!logo || !color) return null;

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="text-[16px] text-muted-foreground">
        {t("Identidad de marca")}
      </div>

      <BrandingField
        setting={logo}
        placeholder="https://example.com/logo.png"
        saving={save.isPending && save.variables?.key === logo.key}
        error={
          save.variables?.key === logo.key ? save.error?.message : undefined
        }
        onSave={(value) => save.mutate({ key: logo.key, value })}
        preview={(value) =>
          value ? (
            <img
              src={value}
              alt=""
              className="h-[32px] max-w-[140px] object-contain"
            />
          ) : null
        }
      />

      <BrandingField
        setting={color}
        placeholder="#2563eb"
        saving={save.isPending && save.variables?.key === color.key}
        error={
          save.variables?.key === color.key ? save.error?.message : undefined
        }
        onSave={(value) => save.mutate({ key: color.key, value })}
        preview={(value) =>
          value ? (
            <span
              className="inline-block w-[24px] h-[24px] rounded-full border border-border"
              style={{ backgroundColor: value }}
            />
          ) : null
        }
      />
    </div>
  );
}

function BrandingField({
  setting,
  placeholder,
  saving,
  error,
  onSave,
  preview,
}: {
  setting: SettingRow;
  placeholder: string;
  saving: boolean;
  error?: string;
  onSave: (value: string) => void;
  preview: (value: string) => ReactNode;
}) {
  const { translate: t } = useTranslation();
  const initial = (setting.value as string) ?? "";
  const [draft, setDraft] = useState(initial);
  const dirty = draft !== initial;
  const disabled = !setting.can_edit;

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="label">{t(setting.label)}</div>
      <div className="flex items-center gap-[12px]">
        <input
          className="text grow"
          placeholder={placeholder}
          disabled={disabled}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        {preview(draft)}
      </div>
      {setting.description && (
        <div className="text-[12px] text-muted-foreground">
          {t(setting.description)}
        </div>
      )}
      {error && <div className="text-destructive text-[13px]">{error}</div>}
      {!disabled && dirty && (
        <div>
          <Button
            type="button"
            loading={saving}
            onClick={() => onSave(draft.trim())}
          >
            {t("Guardar")}
          </Button>
        </div>
      )}
    </div>
  );
}
