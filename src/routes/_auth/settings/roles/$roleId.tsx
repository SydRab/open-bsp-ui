// [crm] Permission toggles for one role (P1-02). Every toggle calls
// crm.set_role_permission, which enforces the rules: roles.manage, the owner
// role is locked, no role at or above your own tier (unless you are an
// owner), each permission's tier floor, and never granting what you lack.
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionFooter from "@/components/SectionFooter";
import Switch from "@/components/Switch";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import {
  useMyPermissions,
  usePermissionCatalog,
  useResetRolePermissions,
  useRoles,
  useSetRolePermission,
} from "@/queries/useCrm";
import { canEditRole, tierRank } from "@/utils/crmRoles";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/settings/roles/$roleId")({
  component: EditRole,
});

const CATEGORY_LABELS: Record<string, string> = {
  organization: "Organization",
  team: "Team",
  inbox: "Inbox",
  contacts: "Contacts",
  pipeline: "Sales pipeline",
  marketing: "Marketing",
  payments: "Payments",
  classroom: "Classroom",
  reports: "Reports",
  integrations: "Integrations",
};

function EditRole() {
  const { roleId } = Route.useParams();
  const { translate: t } = useTranslation();
  const { data: roles } = useRoles();
  const { data: catalog } = usePermissionCatalog();
  const { data: currentAgent } = useCurrentAgent();
  const { can } = useMyPermissions();
  const setPermission = useSetRolePermission();
  const resetRole = useResetRolePermissions();

  const role = roles?.find((r) => r.id === roleId);
  if (!role || !catalog) return null;

  const editable = can("roles.manage") && canEditRole(role, currentAgent?.role);
  const granted = new Set(role.permissions);

  const categories = [...new Set(catalog.map((p) => p.category))];

  const reason = (permission: (typeof catalog)[number]): string | null => {
    if (!editable) return null;
    if (tierRank(permission.min_tier) > tierRank(role.tier)) {
      return t("Requires an admin-level role or higher");
    }
    if (!granted.has(permission.key) && !can(permission.key)) {
      return t("You can't grant a permission you don't have");
    }
    return null;
  };

  return (
    <>
      <SectionHeader title={t(role.name)} />

      <SectionBody className="gap-[24px]">
        {role.description && (
          <p className="text-muted-foreground text-[14px]">
            {t(role.description)}
          </p>
        )}
        {!editable && (
          <p className="text-muted-foreground text-[14px]">
            {role.is_locked
              ? t("The Owner role always has every permission.")
              : t("You can't change this role.")}
          </p>
        )}

        {setPermission.error && (
          <div className="text-destructive text-[13px]">
            {setPermission.error.message}
          </div>
        )}

        {categories.map((category) => (
          <div key={category} className="flex flex-col gap-[8px]">
            <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
              {t(CATEGORY_LABELS[category] ?? category)}
            </div>
            {catalog
              .filter((p) => p.category === category)
              .map((permission) => {
                const blocked = reason(permission);
                const isOn = granted.has(permission.key);
                // Switching off is always allowed when the role is editable.
                const disabled =
                  !editable ||
                  setPermission.isPending ||
                  (!isOn && blocked !== null);
                return (
                  <label
                    key={permission.key}
                    title={!isOn && blocked ? blocked : undefined}
                    className={
                      "flex items-center justify-between gap-[16px] py-[6px] " +
                      (disabled ? "opacity-60" : "cursor-pointer")
                    }
                  >
                    <div className="min-w-0">
                      <div className="text-[15px]">
                        {t(permission.description)}
                      </div>
                      <div className="text-[12px] text-muted-foreground font-mono">
                        {permission.key}
                      </div>
                    </div>
                    <Switch
                      checked={isOn}
                      disabled={disabled}
                      onCheckedChange={(enabled) =>
                        setPermission.mutate({
                          roleId: role.id,
                          permission: permission.key,
                          enabled,
                        })
                      }
                    />
                  </label>
                );
              })}
          </div>
        ))}
      </SectionBody>

      <SectionFooter>
        <Button
          type="button"
          disabled={!editable}
          loading={resetRole.isPending}
          disabledReason={t("You can't change this role.")}
          onClick={() => {
            if (window.confirm(t("Reset to the default permissions?")))
              resetRole.mutate(role.id);
          }}
        >
          {t("Reset to defaults")}
        </Button>
      </SectionFooter>
    </>
  );
}
