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
      <SectionHeader title={t("Agregar miembro")} />

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
                        "La invitación se creó, pero no se pudo enviar el correo. La persona la verá al iniciar sesión.",
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
              label={t("Rol")}
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
              <div className="label">{t("Correo electrónico")}</div>
              <input
                type="email"
                className="text"
                placeholder={t("usuario@ejemplo.com")}
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
          disabledReason={t("Requiere el permiso para invitar miembros")}
          className="primary"
        >
          {t("Invitar")}
        </Button>
      </SectionFooter>
    </>
  );
}
