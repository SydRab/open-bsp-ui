// [crm] Rules & modules (P1-04): the organization's settings, grouped by
// category. Each shows its effective value, where it comes from (platform
// default, pack, or this organization), and a reset. Locked settings are
// compliance minimums set by the platform. Every member can read; changing
// needs the setting's permission (organization.manage by default), enforced
// by the database.
import { createFileRoute } from "@tanstack/react-router";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SettingEditor from "@/components/SettingEditor";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type SettingRow,
  useFeatures,
  useSaveSetting,
  useSettings,
} from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/rules/")({
  component: Rules,
});

const CATEGORIES: { key: string; label: string }[] = [
  { key: "messaging", label: "Mensajes" },
  { key: "approvals", label: "Aprobaciones" },
  { key: "disclaimer", label: "Aviso legal" },
  { key: "trial", label: "Clase de prueba" },
  { key: "modules", label: "Módulos" },
];

const SOURCE_LABELS: Record<SettingRow["source"], string> = {
  platform: "Predeterminado",
  pack: "Del pack",
  tenant: "Personalizado",
  team: "Del equipo",
  user: "Personal",
};

function Rules() {
  const { translate: t } = useTranslation();
  const { data: settings, isLoading } = useSettings();
  const { data: features } = useFeatures();
  const save = useSaveSetting();

  // A module not in the plan (P1-09) stays off regardless of can_edit: the
  // database already refuses crm.set_setting for it, this just explains why.
  const planLocked = new Map(
    (features ?? [])
      .filter((f) => !f.enabled)
      .map((f) => [`modules.${f.key}`, f.unlocks_at_tier]),
  );

  const known = new Set(CATEGORIES.map((c) => c.key));
  const groups = [
    ...CATEGORIES,
    // Categories added later still show, with their raw name.
    ...[...new Set((settings ?? []).map((s) => s.category))]
      .filter((c) => !known.has(c))
      .map((c) => ({ key: c, label: c })),
  ];

  return (
    <>
      <SectionHeader title={t("Reglas y módulos")} />

      <SectionBody className="gap-[24px]">
        {isLoading && (
          <div className="flex justify-center p-[16px]">
            <Spinner size={20} />
          </div>
        )}

        {groups.map((group) => {
          const rows = (settings ?? []).filter((s) => s.category === group.key);
          if (rows.length === 0) return null;
          return (
            <div key={group.key} className="flex flex-col gap-[12px] px-[6px]">
              <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
                {t(group.label)}
              </div>
              {rows.map((setting) => (
                <SettingBlock
                  key={setting.key}
                  setting={setting}
                  // undefined when the plan includes it (or it isn't a module).
                  planUnlocksAtTier={planLocked.get(setting.key)}
                  saving={save.isPending && save.variables?.key === setting.key}
                  // Shown under the setting that was saved, until the next save.
                  error={
                    save.variables?.key === setting.key
                      ? save.error?.message
                      : undefined
                  }
                  onSave={(value) => save.mutate({ key: setting.key, value })}
                />
              ))}
            </div>
          );
        })}
      </SectionBody>
    </>
  );
}

function SettingBlock({
  setting,
  planUnlocksAtTier,
  saving,
  error,
  onSave,
}: {
  setting: SettingRow;
  /** Set (to the tier that would include it, or null) when a module is not
   * in the current plan; crm.set_setting already refuses turning it on. */
  planUnlocksAtTier?: string | null;
  saving: boolean;
  error?: string;
  onSave: (value: unknown) => void;
}) {
  const { translate: t } = useTranslation();
  const planLocked = planUnlocksAtTier !== undefined;
  const disabled = !setting.can_edit || planLocked;
  const inline = setting.schema.type === "boolean";

  const meta = (
    <div className="flex flex-wrap items-center gap-[8px] text-[12px] text-muted-foreground">
      {planLocked ? (
        <span className="rounded-full bg-accent px-[8px] py-[1px]">
          {planUnlocksAtTier
            ? t("No incluido en tu plan (disponible en {tier})").replace(
                "{tier}",
                planUnlocksAtTier,
              )
            : t("No incluido en tu plan")}
        </span>
      ) : (
        <span className="rounded-full bg-accent px-[8px] py-[1px]">
          {setting.is_locked
            ? t("Fijado por la plataforma")
            : t(SOURCE_LABELS[setting.source])}
        </span>
      )}
      {setting.team_conflict && (
        <span className="text-destructive">
          {t(
            "Tus equipos tienen valores distintos; se usa el de la organización.",
          )}
        </span>
      )}
      {setting.can_edit && setting.tenant_value !== null && (
        <button
          type="button"
          className="text-primary font-bold cursor-pointer"
          disabled={saving}
          onClick={() => onSave(null)}
        >
          {t("Restablecer")}
        </button>
      )}
    </div>
  );

  return (
    <div
      className="flex flex-col gap-[6px] py-[6px]"
      data-setting={setting.key}
    >
      <div className="flex items-start justify-between gap-[16px]">
        <div className="min-w-0">
          <div className="text-[15px]">{t(setting.label)}</div>
          {setting.description && (
            <div className="text-[13px] text-muted-foreground">
              {t(setting.description)}
            </div>
          )}
        </div>
        {inline && (
          <SettingEditor
            setting={setting}
            disabled={disabled}
            saving={saving}
            onSave={onSave}
          />
        )}
      </div>
      {!inline && (
        <SettingEditor
          // Remount when the saved value changes, so drafts start fresh.
          key={JSON.stringify(setting.value)}
          setting={setting}
          disabled={disabled}
          saving={saving}
          onSave={onSave}
        />
      )}
      {error && <div className="text-destructive text-[13px]">{error}</div>}
      {meta}
    </div>
  );
}
