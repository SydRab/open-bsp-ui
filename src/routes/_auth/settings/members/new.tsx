import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import { useForm } from "react-hook-form";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import Button from "@/components/Button";
import SelectField from "@/components/SelectField";
// [crm] Invite with one of the organization's crm roles; the crm-invitations
// edge function creates the invitation and sends the email.
import { useInviteMember, useMyPermissions, useRoles } from "@/queries/useCrm";
import { assignableRoles } from "@/utils/crmRoles";

export const Route = createFileRoute("/_auth/settings/members/new")({
  component: AddMember,
});

type InviteForm = { email: string; role_key: string };

function AddMember() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const inviteMember = useInviteMember();
  const { data: agent } = useCurrentAgent();
  const { data: roles } = useRoles();
  const { can } = useMyPermissions();
  const canInvite = can("members.invite");
  const options = assignableRoles(roles, agent?.role);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { isValid, isDirty },
  } = useForm<InviteForm>({
    defaultValues: { role_key: "viewer" },
  });

  const selected = roles?.find((r) => r.key === watch("role_key"));

  return (
    <>
      <SectionHeader title={t("Add member")} />

      <SectionBody>
        <form
          id="create-member-form"
          onSubmit={handleSubmit((data) =>
            inviteMember.mutate(
              { email: data.email, roleKey: data.role_key },
              {
                onSuccess: (result) => {
                  if (result?.email_delivery === "failed") {
                    window.alert(
                      t(
                        "The invitation was created, but the email could not be sent. The person will see it when they sign in.",
                      ),
                    );
                  }
                  void navigate({
                    to: "/settings/members",
                    hash: (prevHash) => prevHash!,
                  });
                },
              },
            ),
          )}
        >
          <fieldset disabled={!canInvite} className="contents">
            <SelectField
              name="role_key"
              control={control}
              label={t("Role")}
              options={options.map((r) => ({
                value: r.key,
                label: t(r.name),
              }))}
              required
            />

            {selected?.description && (
              <p className="text-muted-foreground text-[14px]">
                {t(selected.description)}
              </p>
            )}

            <label>
              <div className="label">{t("Email")}</div>
              <input
                type="email"
                className="text"
                placeholder={t("user@example.com")}
                {...register("email", {
                  required: true,
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
              />
            </label>

            {inviteMember.error && (
              <div className="text-destructive text-[13px]">
                {inviteMember.error.message}
              </div>
            )}
          </fieldset>
        </form>
      </SectionBody>

      <SectionFooter>
        <Button
          form="create-member-form"
          type="submit"
          disabled={!canInvite}
          invalid={!isValid || !isDirty}
          loading={inviteMember.isPending}
          disabledReason={t("Requires permission to invite members")}
          className="primary"
        >
          {t("Invite")}
        </Button>
      </SectionFooter>
    </>
  );
}
