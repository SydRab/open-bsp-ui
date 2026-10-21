// [crm] Super-admin console (P1-10): the platform-wide kill switch per
// feature (crm.set_feature_kill_switch) — when on, the feature is
// unavailable to every organization regardless of plan or per-tenant
// override. Per-organization overrides live on the tenant detail page
// instead, since those need the organization id.
import { createFileRoute } from "@tanstack/react-router";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import Spinner from "@/components/Spinner";
import Switch from "@/components/Switch";
import { useTranslation } from "@/hooks/useTranslation";
import { useFeatureCatalog } from "@/queries/useCrm";
import { useSetKillSwitch } from "@/queries/useAdmin";

export const Route = createFileRoute("/_auth/admin/features")({
  component: FeatureKillSwitches,
});

function FeatureKillSwitches() {
  const { translate: t } = useTranslation();
  const { data: features, isLoading } = useFeatureCatalog();
  const setKillSwitch = useSetKillSwitch();

  return (
    <>
      <SectionHeader title={t("Interruptores de función")} />

      <SectionBody>
        <p className="text-muted-foreground text-[13px] px-[6px] pb-[8px]">
          {t(
            "Al activarlo, la función deja de estar disponible para todas las organizaciones, sin importar su plan.",
          )}
        </p>

        {isLoading && (
          <div className="flex justify-center p-[16px]">
            <Spinner size={20} />
          </div>
        )}

        {features?.map((feature) => (
          <label
            key={feature.key}
            className="flex items-center justify-between gap-[16px] py-[10px] px-[6px] border-b border-border last:border-none"
          >
            <div className="min-w-0">
              <div className="text-[15px]">{t(feature.label)}</div>
              {feature.description && (
                <div className="text-[13px] text-muted-foreground">
                  {t(feature.description)}
                </div>
              )}
            </div>
            <Switch
              checked={feature.kill_switch}
              disabled={setKillSwitch.isPending}
              onCheckedChange={(enabled) =>
                setKillSwitch.mutate({ featureKey: feature.key, enabled })
              }
            />
          </label>
        ))}

        {setKillSwitch.error && (
          <div className="p-[16px] text-destructive text-[13px]">
            {setKillSwitch.error.message}
          </div>
        )}
      </SectionBody>
    </>
  );
}
