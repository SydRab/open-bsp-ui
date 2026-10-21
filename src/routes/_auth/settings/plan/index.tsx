// [crm] Plan & features (P1-09): the organization's tier, seat usage, and
// every feature with why it is or isn't available. Read-only: overrides and
// the kill switch are platform-only (crm.set_organization_feature,
// crm.set_feature_kill_switch) with no admin surface here yet (P1-10).
import { createFileRoute } from "@tanstack/react-router";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { type Feature, useFeatures } from "@/queries/useCrm";
import { useSubscription, useTierLimits, useUsage } from "@/queries/useBilling";

export const Route = createFileRoute("/_auth/settings/plan/")({
  component: PlanAndFeatures,
});

const SOURCE_LABELS: Record<Feature["source"], string> = {
  tier: "De tu plan",
  override: "Activado para ti",
  kill_switch: "Pausado por la plataforma",
  unrestricted: "Sin restricción",
};

function PlanAndFeatures() {
  const { translate: t } = useTranslation();
  const { data: subscription, isLoading: loadingSubscription } =
    useSubscription();
  const { data: usage } = useUsage("lifetime");
  const { data: tierLimits } = useTierLimits();
  const { data: features, isLoading: loadingFeatures } = useFeatures();

  const seatsUsed = usage?.find((u) => u.product_id === "members")?.quantity;
  const seatsCap = tierLimits?.find((tl) => tl.product_id === "members")?.cap;

  return (
    <>
      <SectionHeader title={t("Plan y funciones")} />

      <SectionBody className="gap-[20px]">
        {(loadingSubscription || loadingFeatures) && (
          <div className="flex justify-center p-[16px]">
            <Spinner size={20} />
          </div>
        )}

        <div className="flex flex-col gap-[4px] px-[6px]">
          <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
            {t("Plan actual")}
          </div>
          <div className="text-[18px] font-medium">
            {subscription?.tiers?.name ?? t("Sin plan")}
          </div>
        </div>

        {seatsUsed !== undefined && (
          <div className="flex flex-col gap-[4px] px-[6px]">
            <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
              {t("Miembros")}
            </div>
            <div className="text-[15px]">
              {seatsCap == null
                ? t("{used} (sin límite)").replace("{used}", String(seatsUsed))
                : t("{used} de {cap}")
                    .replace("{used}", String(seatsUsed))
                    .replace("{cap}", String(seatsCap))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-[4px] px-[6px]">
          <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
            {t("Funciones")}
          </div>
          <div className="flex flex-col">
            {features?.map((feature) => (
              <FeatureRow key={feature.key} feature={feature} />
            ))}
          </div>
        </div>
      </SectionBody>
    </>
  );
}

function FeatureRow({ feature }: { feature: Feature }) {
  const { translate: t } = useTranslation();

  return (
    <div className="flex items-start justify-between gap-[16px] py-[8px] border-b border-border last:border-none">
      <div className="min-w-0">
        <div className="text-[15px]">{t(feature.label)}</div>
        {feature.description && (
          <div className="text-[13px] text-muted-foreground">
            {t(feature.description)}
          </div>
        )}
        {!feature.enabled && feature.unlocks_at_tier && (
          <div className="text-[12px] text-muted-foreground mt-[2px]">
            {t("Disponible en el plan {tier}").replace(
              "{tier}",
              feature.unlocks_at_tier,
            )}
          </div>
        )}
        {feature.override_reason && (
          <div className="text-[12px] text-muted-foreground mt-[2px]">
            {feature.override_reason}
            {feature.override_expires_at &&
              " · " +
                t("hasta {date}").replace(
                  "{date}",
                  new Date(feature.override_expires_at).toLocaleDateString(),
                )}
          </div>
        )}
      </div>
      <span
        className={
          "shrink-0 rounded-full px-[8px] py-[1px] text-[12px] " +
          (feature.enabled
            ? "bg-accent text-foreground"
            : "bg-accent text-muted-foreground")
        }
      >
        {feature.enabled ? t(SOURCE_LABELS[feature.source]) : t("No incluida")}
      </span>
    </div>
  );
}
