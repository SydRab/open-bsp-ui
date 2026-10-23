import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import { useTranslation } from "@/hooks/useTranslation";
import { WhatsAppOutlined } from "@ant-design/icons";
import { Link, Plus } from "lucide-react";
import type { JSX } from "react";
import { formatPhoneNumber } from "@/utils/FormatUtils";
import ConnectionOwner from "@/components/ConnectionOwner";
import type { WhatsAppOrganizationAddressExtra } from "@/supabase/client";

export const Route = createFileRoute("/_auth/integrations/whatsapp/")({
  component: WhatsAppIndex,
});

function WhatsAppIndex() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: integrations } = useOrganizationsAddresses();

  const whatsappIntegrations = integrations?.filter(
    (integration) => integration.service === "whatsapp",
  );

  const statusLabels: Record<string, string | JSX.Element> = {
    connected: <span className="text-primary">{t("Conectado")}</span>,
    disconnected: t("Desconectado"),
  };

  return (
    <>
      <SectionHeader title="WhatsApp" />

      <SectionBody className="gap-4">
        <div className="flex flex-col">
          <SectionItem
            title={t("Conectar número")}
            aside={
              <div className="p-[8px] bg-primary/10 rounded-full">
                <Plus className="w-[24px] h-[24px] text-primary" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/integrations/whatsapp/new",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          <SectionItem
            title={t("Invitaciones a terceros")}
            aside={
              <div className="p-[8px]">
                <Link className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/integrations/whatsapp/onboarding",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          {whatsappIntegrations?.map((integration) => {
            const extra =
              integration.extra as WhatsAppOrganizationAddressExtra | null;

            return (
              <SectionItem
                key={integration.address}
                aside={
                  <div className="p-[8px]">
                    <WhatsAppOutlined
                      style={{ fontSize: "24px", color: "#25D366" }}
                    />
                  </div>
                }
                title={formatPhoneNumber(
                  extra?.phone_number || integration.address,
                )}
                description={
                  <>
                    {statusLabels[integration.status] || integration.status}
                    {/* [crm] Mock-connection badge (P2-02) */}
                    {extra?.is_mock && (
                      <span className="text-muted-foreground">
                        {" · "}
                        {t("Prueba")}
                      </span>
                    )}
                    {/* [crm] Needs-reconnect badge (P2-03) */}
                    {extra?.needs_reauth && (
                      <span className="text-destructive">
                        {" · "}
                        {t("Reconectar")}
                      </span>
                    )}
                    {/* [crm] Quality-rating badge (P2-10) */}
                    {extra?.quality_rating === "RED" && (
                      <span className="text-destructive">
                        {" · "}
                        {t("Calidad baja")}
                      </span>
                    )}
                    {extra?.quality_rating === "YELLOW" && (
                      <span className="text-yellow-700 dark:text-yellow-400">
                        {" · "}
                        {t("Calidad media")}
                      </span>
                    )}
                    <ConnectionOwner agentId={integration.agent_id} />
                  </>
                }
                onClick={() =>
                  navigate({
                    to: "/integrations/whatsapp/$orgAddressId",
                    params: { orgAddressId: integration.address },
                    hash: (prevHash) => prevHash!,
                  })
                }
              />
            );
          })}
        </div>
      </SectionBody>
    </>
  );
}
