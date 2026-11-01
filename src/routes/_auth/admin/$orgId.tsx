// [crm] Super-admin console (P1-10): one tenant's lifecycle, plan, and
// feature overrides, plus — only while the admin holds an active
// support-access grant for this organization — its resolved configuration
// and audit log. Message and contact content is never exposed here: see
// crm.admin_get_tenant_config's own comment for why that boundary holds.
import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { History, ShieldCheck } from "lucide-react";
import Button from "@/components/Button";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import SelectField from "@/components/SelectField";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { useTiers } from "@/queries/useBilling";
import { usePermissionCatalog } from "@/queries/useCrm";
import {
  useClearFeatureOverride,
  useGrantSupportAccess,
  useReactivateOrganization,
  useRevokeSupportAccess,
  useSetFeatureOverride,
  useSetTier,
  useSuspendOrganization,
  useSupportAccess,
  useTenantAuditLog,
  useTenantConfig,
  useTenants,
  useUpgradePack,
} from "@/queries/useAdmin";
import { describeAction, describeActor } from "@/utils/auditLog";

export const Route = createFileRoute("/_auth/admin/$orgId")({
  component: TenantDetail,
});

const SOURCE_LABELS: Record<string, string> = {
  tier: "From their plan",
  override: "Forced by the platform",
  kill_switch: "Paused by the platform",
  unrestricted: "Unrestricted",
};

function TenantDetail() {
  const { orgId } = Route.useParams();
  const { translate: t } = useTranslation();
  const { data: tenants } = useTenants("");
  const tenant = tenants?.find((o) => o.organization_id === orgId);
  const { data: tiers } = useTiers();
  const { data: permissions } = usePermissionCatalog();

  const suspend = useSuspendOrganization();
  const reactivate = useReactivateOrganization();
  const setTier = useSetTier();
  const upgradePack = useUpgradePack();
  const setFeatureOverride = useSetFeatureOverride();
  const clearFeatureOverride = useClearFeatureOverride();

  const { data: grants } = useSupportAccess(orgId);
  const hasActiveGrant = grants?.some((g) => g.active) ?? false;
  const grantAccess = useGrantSupportAccess();
  const revokeAccess = useRevokeSupportAccess();
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState(24);

  const config = useTenantConfig(orgId, hasActiveGrant);
  const auditLog = useTenantAuditLog(orgId, hasActiveGrant);

  const lookups = {
    roleNames: new Map(config.data?.roles?.map((r) => [r.key, r.name])),
    permissionNames: new Map(permissions?.map((p) => [p.key, p.description])),
    settingNames: new Map(config.data?.settings?.map((s) => [s.key, s.label])),
    featureNames: new Map(config.data?.features?.map((f) => [f.key, f.label])),
  };

  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  if (!tenant) {
    return (
      <>
        <SectionHeader title={t("Organization")} />
        <SectionBody>
          <div className="flex justify-center p-[16px]">
            <Spinner size={20} />
          </div>
        </SectionBody>
      </>
    );
  }

  const outdated =
    tenant.pack_version != null &&
    tenant.latest_pack_version != null &&
    tenant.latest_pack_version > tenant.pack_version;

  return (
    <>
      <SectionHeader title={tenant.name} />

      <SectionBody className="gap-[20px]">
        {/* Status */}
        <Section title={t("Status")}>
          <div className="flex items-center justify-between gap-[12px] px-[6px]">
            <span className="text-[15px]">
              {tenant.status === "suspended" ? t("Suspended") : t("Active")}
            </span>
            {tenant.status === "suspended" ? (
              <Button
                type="button"
                className="primary"
                loading={reactivate.isPending}
                onClick={() => reactivate.mutate({ organizationId: orgId })}
              >
                {t("Reactivate")}
              </Button>
            ) : (
              <Button
                type="button"
                className="destructive"
                loading={suspend.isPending}
                onClick={() => {
                  const why = window.prompt(
                    t("Reason for suspending (optional):"),
                  );
                  if (why !== null)
                    suspend.mutate({ organizationId: orgId, reason: why });
                }}
              >
                {t("Suspend")}
              </Button>
            )}
          </div>
          {(suspend.error ?? reactivate.error) && (
            <div className="text-destructive text-[13px] px-[6px]">
              {(suspend.error ?? reactivate.error)!.message}
            </div>
          )}
        </Section>

        {/* Plan */}
        <Section title={t("Plan")}>
          <SelectField
            label={t("Tier")}
            value={tenant.tier_id ?? ""}
            onChange={(tierId) =>
              setTier.mutate({ organizationId: orgId, tierId })
            }
            options={(tiers ?? []).map((tier) => ({
              value: tier.id,
              label: tier.name,
            }))}
            disabled={setTier.isPending}
          />
          <div className="text-[13px] text-muted-foreground px-[6px]">
            {tenant.seats_cap == null
              ? t("{used} members (no limit)").replace(
                  "{used}",
                  String(tenant.seats_used),
                )
              : t("{used} of {cap} members")
                  .replace("{used}", String(tenant.seats_used))
                  .replace("{cap}", String(tenant.seats_cap))}
          </div>
          {setTier.error && (
            <div className="text-destructive text-[13px] px-[6px]">
              {setTier.error.message}
            </div>
          )}
        </Section>

        {/* Pack */}
        {tenant.pack_key && (
          <Section title={t("Pack")}>
            <div className="flex items-center justify-between gap-[12px] px-[6px]">
              <span className="text-[15px]">
                {tenant.pack_key} v{tenant.pack_version}
                {outdated &&
                  ` → v${tenant.latest_pack_version} ${t("available")}`}
              </span>
              {outdated && (
                <Button
                  type="button"
                  className="primary"
                  loading={upgradePack.isPending}
                  onClick={() => upgradePack.mutate({ organizationId: orgId })}
                >
                  {t("Update")}
                </Button>
              )}
            </div>
            {upgradePack.error && (
              <div className="text-destructive text-[13px] px-[6px]">
                {upgradePack.error.message}
              </div>
            )}
          </Section>
        )}

        {/* Support access */}
        <Section title={t("Support access")}>
          <p className="text-muted-foreground text-[13px] px-[6px]">
            {t(
              "Grant yourself access, with a recorded reason, to view this organization's configuration and activity log. This never gives access to messages or contacts.",
            )}
          </p>
          <div className="flex flex-col gap-[10px] px-[6px]">
            <label>
              <div className="label">{t("Reason")}</div>
              <input
                className="text"
                placeholder={t("E.g. ticket #42")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <label>
              <div className="label">{t("Hours")}</div>
              <input
                type="number"
                className="text"
                min={1}
                max={168}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              />
            </label>
            <Button
              type="button"
              className="primary"
              disabled={reason.trim().length < 3}
              loading={grantAccess.isPending}
              onClick={() =>
                grantAccess.mutate(
                  { organizationId: orgId, reason, hours },
                  { onSuccess: () => setReason("") },
                )
              }
            >
              <ShieldCheck className="w-[18px] h-[18px]" />
              {t("Request access")}
            </Button>
            {grantAccess.error && (
              <div className="text-destructive text-[13px]">
                {grantAccess.error.message}
              </div>
            )}
          </div>

          {grants?.map((grant) => (
            <SectionItem
              key={grant.id}
              className="h-auto! min-h-[56px] py-[8px]"
              title={grant.reason}
              description={`${grant.admin_email} · ${formatTime(grant.granted_at)} → ${formatTime(grant.expires_at)}${grant.active ? "" : ` · ${t("expired or revoked")}`}`}
              aside={
                <div className="p-[8px]">
                  <ShieldCheck
                    className={`w-[20px] h-[20px] ${grant.active ? "text-primary" : "text-muted-foreground"}`}
                  />
                </div>
              }
              onClick={
                grant.active
                  ? () => {
                      if (window.confirm(t("Revoke this access?")))
                        revokeAccess.mutate({
                          grantId: grant.id,
                          organizationId: orgId,
                        });
                    }
                  : undefined
              }
            />
          ))}
        </Section>

        {/* Features — reading the current state needs an active grant; the
            override/clear actions themselves don't (immediate platform
            actions), but without the current state picking enabled/disabled
            blind isn't useful, so both live behind the same gate. */}
        <Section title={t("Features")}>
          {!hasActiveGrant && (
            <div className="text-muted-foreground text-[13px] px-[6px]">
              {t(
                "Request support access to view and change this organization's features.",
              )}
            </div>
          )}
          {hasActiveGrant && config.isLoading && (
            <div className="flex justify-center p-[16px]">
              <Spinner size={20} />
            </div>
          )}
          {hasActiveGrant &&
            config.data?.features?.map((feature) => (
              <div
                key={feature.key}
                className="flex items-center justify-between gap-[12px] px-[6px] py-[8px] border-b border-border last:border-none"
              >
                <div className="min-w-0">
                  <div className="text-[15px]">{t(feature.label)}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {feature.enabled
                      ? t(SOURCE_LABELS[feature.source] ?? feature.source)
                      : t("Not included")}
                    {feature.override_reason && ` · ${feature.override_reason}`}
                  </div>
                </div>
                <div className="flex gap-[6px] shrink-0">
                  {feature.source === "override" ? (
                    <Button
                      type="button"
                      className="destructive"
                      loading={clearFeatureOverride.isPending}
                      onClick={() =>
                        clearFeatureOverride.mutate({
                          organizationId: orgId,
                          featureKey: feature.key,
                        })
                      }
                    >
                      {t("Remove")}
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        loading={setFeatureOverride.isPending}
                        onClick={() => {
                          const why = window.prompt(t("Reason:"));
                          if (why)
                            setFeatureOverride.mutate({
                              organizationId: orgId,
                              featureKey: feature.key,
                              enabled: true,
                              reason: why,
                            });
                        }}
                      >
                        {t("Force on")}
                      </Button>
                      <Button
                        type="button"
                        loading={setFeatureOverride.isPending}
                        onClick={() => {
                          const why = window.prompt(t("Reason:"));
                          if (why)
                            setFeatureOverride.mutate({
                              organizationId: orgId,
                              featureKey: feature.key,
                              enabled: false,
                              reason: why,
                            });
                        }}
                      >
                        {t("Force off")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          {(setFeatureOverride.error ?? clearFeatureOverride.error) && (
            <div className="text-destructive text-[13px] px-[6px]">
              {
                (setFeatureOverride.error ?? clearFeatureOverride.error)!
                  .message
              }
            </div>
          )}
        </Section>

        {/* Audit log — same support-access gate as above. */}
        <Section title={t("Activity log")}>
          {!hasActiveGrant && (
            <div className="text-muted-foreground text-[13px] px-[6px]">
              {t("Request support access to view the activity log.")}
            </div>
          )}
          {hasActiveGrant && auditLog.isLoading && (
            <div className="flex justify-center p-[16px]">
              <Spinner size={20} />
            </div>
          )}
          {hasActiveGrant &&
            auditLog.data?.map((entry) => (
              <SectionItem
                key={entry.id}
                className="h-auto! min-h-[64px] py-[8px]"
                title={
                  <span className="whitespace-normal break-words">
                    {describeAction(entry, t, lookups)}
                  </span>
                }
                description={`${describeActor(entry, t)} · ${formatTime(entry.created_at)}`}
                aside={
                  <div className="p-[8px]">
                    <History className="w-[18px] h-[18px] text-muted-foreground" />
                  </div>
                }
              />
            ))}
        </Section>
      </SectionBody>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide px-[6px]">
        {title}
      </div>
      {children}
    </div>
  );
}
