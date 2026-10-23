import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useAgent,
  useUpdateAgent,
  useDeleteAgent,
  useCurrentAgent,
  useCurrentAgents,
} from "@/queries/useAgents";
import useBoundStore from "@/stores/useBoundStore";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { HumanAgentRow } from "@/supabase/client";
import Button from "@/components/Button";
import SelectField from "@/components/SelectField";
import { queryKeys } from "@/queries/queryKeys";
// [crm] The role is a crm role (eight presets), changed through
// crm.set_member_role; removing someone else is crm.deactivate_member.
import {
  useDeactivateMember,
  useMemberRoles,
  useMyPermissions,
  useRoles,
  useSetMemberRole,
} from "@/queries/useCrm";
import { assignableRoles, tierRank } from "@/utils/crmRoles";
import MemberAddressAccess from "@/components/MemberAddressAccess";

export const Route = createFileRoute("/_auth/settings/members/$memberId")({
  component: EditMember,
});

function EditMember() {
  const { memberId } = Route.useParams();
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: agent } = useAgent<HumanAgentRow>(memberId);
  const { data: allAgents } = useCurrentAgents();
  const { data: currentAgent } = useCurrentAgent();
  const { data: roles } = useRoles();
  const { data: memberRoles } = useMemberRoles();
  const { can } = useMyPermissions();
  const isMe = currentAgent?.id === memberId;
  const setActiveOrg = useBoundStore((state) => state.ui.setActiveOrg);
  const queryClient = useQueryClient();

  // Managing someone needs members.manage and a tier at least theirs.
  const canManage =
    can("members.manage") &&
    tierRank(currentAgent?.role) >= tierRank(agent?.role);

  const ownersCount =
    allAgents?.filter((a) => a.user_id !== null && a.role === "owner").length ||
    0;
  const isLastOwner = agent?.role === "owner" && ownersCount <= 1;

  const updateAgent = useUpdateAgent();
  const leave = useDeleteAgent();
  const deactivate = useDeactivateMember();
  const setRole = useSetMemberRole();

  const currentRoleId = memberRoles?.get(memberId);
  const currentRoleKey = roles?.find((r) => r.id === currentRoleId)?.key;
  const options = assignableRoles(roles, currentAgent?.role);

  const onDelete = () => {
    if (isMe) {
      leave.mutate(memberId, {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.organizations.all(),
          });
          setActiveOrg(null);
          void navigate({ to: "/conversations" });
        },
      });
    } else {
      deactivate.mutate(memberId, {
        onSuccess: () =>
          void navigate({ to: "..", hash: (prevHash) => prevHash! }),
      });
    }
  };

  const {
    register,
    handleSubmit,
    formState: { isValid, isDirty },
  } = useForm<{ name: string }>({
    values: agent ? { name: agent.name } : undefined,
  });

  if (!agent) return;

  return (
    <>
      <SectionHeader
        title={agent.name}
        onDelete={onDelete}
        deleteDisabled={(!canManage && !isMe) || (isMe && isLastOwner)}
        deleteDisabledReason={
          isLastOwner
            ? t("No se puede eliminar al único propietario")
            : t("Requiere el permiso para gestionar miembros")
        }
        deleteLoading={leave.isPending || deactivate.isPending}
      />
      <SectionBody>
        <form
          id="member-form"
          onSubmit={handleSubmit((data) =>
            updateAgent.mutate({ id: agent.id, name: data.name }),
          )}
        >
          <label>
            <div className="label">{t("Nombre")}</div>
            <input
              className="text"
              disabled={!canManage && !isMe}
              placeholder={t("Nombre del miembro")}
              {...register("name", { required: true })}
            />
          </label>
        </form>

        <SelectField
          label={t("Rol")}
          value={currentRoleKey ?? ""}
          onChange={(roleKey) => setRole.mutate({ agentId: agent.id, roleKey })}
          options={(canManage ? options : (roles ?? [])).map((r) => ({
            value: r.key,
            label: t(r.name),
          }))}
          disabled={!canManage || setRole.isPending}
        />

        {/* [crm] P2-12 */}
        <MemberAddressAccess
          agentId={agent.id}
          disabled={!canManage}
          warnSelfLockout={tierRank(agent?.role) >= tierRank("admin")}
        />

        {(setRole.error || deactivate.error) && (
          <div className="text-destructive text-[13px]">
            {(setRole.error ?? deactivate.error)!.message.includes("last owner")
              ? t("No se puede quitar al único propietario")
              : (setRole.error ?? deactivate.error)!.message}
          </div>
        )}
      </SectionBody>

      <SectionFooter>
        <Button
          form="member-form"
          type="submit"
          disabled={!canManage && !isMe}
          invalid={!isValid || !isDirty}
          loading={updateAgent.isPending}
          disabledReason={t("Requiere el permiso para gestionar miembros")}
          className="primary"
        >
          {t("Actualizar")}
        </Button>
      </SectionFooter>
    </>
  );
}
