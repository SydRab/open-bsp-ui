// [crm] Super-admin console (P1-10): platform admins are a separate axis
// from tenant roles (crm.platform_admins), granted/revoked by email through
// the crm-admin edge function. Revoking the last admin is refused by the
// database (crm.revoke_platform_admin), not just by this UI.
import { useForm } from "react-hook-form";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldUser } from "lucide-react";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useGrantPlatformAdmin,
  usePlatformAdmins,
  useRevokePlatformAdmin,
} from "@/queries/useAdmin";

export const Route = createFileRoute("/_auth/admin/admins")({
  component: PlatformAdmins,
});

function PlatformAdmins() {
  const { translate: t } = useTranslation();
  const { data: admins, isLoading, error } = usePlatformAdmins();
  const grant = useGrantPlatformAdmin();
  const revoke = useRevokePlatformAdmin();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<{ email: string }>();

  return (
    <>
      <SectionHeader title={t("Administradores de la plataforma")} />

      <SectionBody>
        <form
          id="grant-admin-form"
          className="px-[6px] pb-[8px]"
          onSubmit={handleSubmit((data) =>
            grant.mutate({ email: data.email }, { onSuccess: () => reset() }),
          )}
        >
          <label>
            <div className="label">{t("Correo electrónico")}</div>
            <input
              type="email"
              className="text"
              placeholder={t("usuario@ejemplo.com")}
              {...register("email", { required: true })}
            />
          </label>
          {grant.error && (
            <div className="text-destructive text-[13px] mt-[4px]">
              {grant.error.message}
            </div>
          )}
        </form>

        {isLoading && (
          <div className="flex justify-center p-[16px]">
            <Spinner size={20} />
          </div>
        )}

        {error && (
          <div className="p-[16px] text-destructive">{error.message}</div>
        )}

        {admins?.map((admin) => (
          <SectionItem
            key={admin.user_id}
            title={admin.email}
            description={
              admin.granted_by_email
                ? t("Otorgado por {email}").replace(
                    "{email}",
                    admin.granted_by_email,
                  )
                : t("Administrador fundador")
            }
            aside={
              <Avatar
                fallback={admin.email.substring(0, 2).toUpperCase()}
                size={40}
                className="bg-muted text-muted-foreground"
              />
            }
            onClick={() => {
              if (window.confirm(t("¿Revocar el acceso de administrador?")))
                revoke.mutate({ userId: admin.user_id });
            }}
          />
        ))}

        {revoke.error && (
          <div className="p-[16px] text-destructive text-[13px]">
            {revoke.error.message}
          </div>
        )}
      </SectionBody>

      <SectionFooter>
        <Button
          form="grant-admin-form"
          type="submit"
          invalid={!isValid}
          loading={grant.isPending}
          className="primary"
        >
          <ShieldUser className="w-[18px] h-[18px]" />
          {t("Otorgar acceso de administrador")}
        </Button>
      </SectionFooter>
    </>
  );
}
