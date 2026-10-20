import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import { useTranslation } from "@/hooks/useTranslation";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Users,
  Webhook,
  Key,
  ShieldCheck,
  History,
} from "lucide-react";
import { useMyPermissions } from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/")({
  component: SettingsIndex,
});

function SettingsIndex() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { can } = useMyPermissions();

  return (
    <>
      <SectionHeader title={t("Preferencias")} />

      <SectionBody className="gap-4">
        <div className="flex flex-col">
          <SectionItem
            title={t("Organización")}
            aside={
              <div className="p-[8px]">
                <Building2 className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/organization",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          <SectionItem
            title={t("Miembros")}
            aside={
              <div className="p-[8px]">
                <Users className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/members",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          {/* [crm] Roles & permissions (P1-02) */}
          <SectionItem
            title={t("Roles y permisos")}
            aside={
              <div className="p-[8px]">
                <ShieldCheck className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/roles",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          {/* [crm] Activity log (P1-08) */}
          {can("audit.view") && (
            <SectionItem
              title={t("Registro de actividad")}
              aside={
                <div className="p-[8px]">
                  <History className="w-[24px] h-[24px] text-muted-foreground" />
                </div>
              }
              onClick={() =>
                navigate({
                  to: "/settings/activity",
                  hash: (prevHash) => prevHash!,
                })
              }
            />
          )}
          <SectionItem
            title={t("Webhooks")}
            aside={
              <div className="p-[8px]">
                <Webhook className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/webhooks",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          <SectionItem
            title={t("Claves API")}
            aside={
              <div className="p-[8px]">
                <Key className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/api-keys",
                hash: (prevHash) => prevHash!,
              })
            }
          />
        </div>
      </SectionBody>
    </>
  );
}
