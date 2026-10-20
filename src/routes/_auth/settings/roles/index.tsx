// [crm] Roles & permissions (P1-02): the organization's eight preset roles.
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import { useTranslation } from "@/hooks/useTranslation";
import { useMemberRoles, useRoles } from "@/queries/useCrm";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_auth/settings/roles/")({
  component: ListRoles,
});

function ListRoles() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: roles } = useRoles();
  const { data: memberRoles } = useMemberRoles();

  const membersPerRole = new Map<string, number>();
  memberRoles?.forEach((roleId) =>
    membersPerRole.set(roleId, (membersPerRole.get(roleId) ?? 0) + 1),
  );

  return (
    <>
      <SectionHeader title={t("Roles y permisos")} />

      <SectionBody>
        {roles?.map((role) => {
          const members = membersPerRole.get(role.id) ?? 0;
          return (
            <SectionItem
              key={role.id}
              title={t(role.name)}
              description={
                `${role.permissions.length} ${t("permisos")} · ${members} ${t(
                  members === 1 ? "miembro" : "miembros",
                )}` + (role.is_locked ? ` · ${t("siempre tiene todo")}` : "")
              }
              aside={
                <div className="p-[8px]">
                  {role.is_locked ? (
                    <Lock className="w-[24px] h-[24px] text-muted-foreground" />
                  ) : (
                    <ShieldCheck className="w-[24px] h-[24px] text-muted-foreground" />
                  )}
                </div>
              }
              onClick={() =>
                navigate({
                  to: "/settings/roles/$roleId",
                  params: { roleId: role.id },
                  hash: (prevHash) => prevHash!,
                })
              }
            />
          );
        })}
      </SectionBody>
    </>
  );
}
