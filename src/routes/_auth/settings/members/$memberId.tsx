import { useState } from "react";
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
  useMyWhatsappAddress,
  useRoles,
  useSetMemberRole,
  useSetMyWhatsappAddress,
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

        {/* [crm] P3-07d: self-service only -- not something an admin sets
            on someone else's behalf, same as any other personal contact
            info. */}
        {isMe && <MyWhatsappAddress />}

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

// [crm] P3-07d: where WhatsApp-delivered internal alerts (task reminders
// today, speed-to-lead's own alerts once P3-06 is retrofitted) reach this
// member. Self-service -- digits-only with country code, same as any
// other stored address, validated again server-side.
function MyWhatsappAddress() {
  const { translate: t } = useTranslation();
  const { data: address } = useMyWhatsappAddress();
  const save = useSetMyWhatsappAddress();
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? address ?? "";

  return (
    <label>
      <div className="label">{t("Tu número de WhatsApp para alertas")}</div>
      <div className="flex gap-[8px]">
        <input
          className="text grow"
          placeholder="919000000000"
          value={value}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          type="button"
          loading={save.isPending}
          disabled={draft === null || draft === (address ?? "")}
          onClick={() =>
            save.mutate(draft!.trim() === "" ? null : draft, {
              onSuccess: () => setDraft(null),
            })
          }
        >
          {t("Guardar")}
        </Button>
      </div>
      {save.error && (
        <div className="text-destructive text-[13px] mt-[4px]">
          {save.error.message}
        </div>
      )}
    </label>
  );
}
