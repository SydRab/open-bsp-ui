import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useCurrentAgents,
  useCurrentAgent,
  useOrgInvitations,
} from "@/queries/useAgents";
// [crm] Roles shown are crm roles; inviting and revoking need members.invite.
import {
  useInvitationRoles,
  useMemberRoles,
  useMyPermissions,
  useRevokeCrmInvitation,
  useRoles,
} from "@/queries/useCrm";
import SectionItem from "@/components/SectionItem";
import Avatar from "@/components/Avatar";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_auth/settings/members/")({
  component: ListMembers,
});

function ListMembers() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: agents } = useCurrentAgents();
  const { data: invitations } = useOrgInvitations();
  const { data: currentAgent } = useCurrentAgent();
  const revokeInvitation = useRevokeCrmInvitation();
  const { data: crmRoles } = useRoles();
  const { data: memberRoles } = useMemberRoles();
  const { data: invitationRoles } = useInvitationRoles();
  const { can } = useMyPermissions();
  const canInvite = can("members.invite");

  const tierNames: Record<string, string> = {
    owner: t("Owner"),
    admin: t("Administrator"),
    member: t("Member"),
  };
  const roleName = (roleId: string | undefined, tier: string | null) => {
    const role = crmRoles?.find((r) => r.id === roleId);
    return role ? t(role.name) : tierNames[tier || "member"];
  };

  return (
    <>
      <SectionHeader title={t("Members")} />

      <SectionBody>
        <SectionItem
          title={t("Add member")}
          aside={
            <div className="p-[8px] bg-primary/10 rounded-full">
              <Plus className="w-[24px] h-[24px] text-primary" />
            </div>
          }
          onClick={() =>
            navigate({
              to: "/settings/members/new",
              hash: (prevHash) => prevHash!,
            })
          }
          disabled={!canInvite}
          disabledReason={t("Requires permission to invite members")}
        />
        {agents
          ?.filter((agent) => agent.user_id !== null)
          .map((agent) => {
            const role = roleName(memberRoles?.get(agent.id), agent.role);
            const isMe = agent.id === currentAgent?.id;

            return (
              <SectionItem
                key={agent.id}
                title={agent.name + (isMe ? ` (${t("you")})` : "")}
                description={role}
                aside={
                  <Avatar
                    src={agent.picture}
                    fallback={agent.name?.substring(0, 2).toUpperCase()}
                    size={40}
                    className="bg-muted text-muted-foreground"
                  />
                }
                onClick={() =>
                  navigate({
                    to: `/settings/members/${agent.id}`,
                    hash: (prevHash) => prevHash!,
                  })
                }
              />
            );
          })}
        {invitations?.map((invitation) => (
          <SectionItem
            key={invitation.id}
            title={invitation.email}
            description={
              roleName(invitationRoles?.get(invitation.id), invitation.role) +
              ` (${t("pending")})`
            }
            aside={
              <Avatar
                fallback={invitation.email.substring(0, 2).toUpperCase()}
                size={40}
                className="bg-muted text-muted-foreground"
              />
            }
            onClick={() => {
              if (canInvite && window.confirm(t("Revoke this invitation?")))
                revokeInvitation.mutate(invitation.id);
            }}
            disabled={!canInvite}
            disabledReason={t("Requires permission to invite members")}
          />
        ))}
      </SectionBody>
    </>
  );
}
