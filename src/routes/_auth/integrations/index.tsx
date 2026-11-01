import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { InstagramOutlined, WhatsAppOutlined } from "@ant-design/icons";
import ServiceIcon from "@/components/ServiceIcon";

export const Route = createFileRoute("/_auth/integrations/")({
  component: IntegrationsIndex,
});

function IntegrationsIndex() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <SectionHeader title={t("Integrations")} />
      <SectionBody className="gap-4">
        <div className="flex flex-col">
          <SectionItem
            aside={
              <div className="p-[8px]">
                <WhatsAppOutlined
                  style={{ fontSize: "24px", color: "#25D366" }}
                />
              </div>
            }
            title="WhatsApp"
            description={t("Official connection via Meta API")}
            onClick={() =>
              navigate({
                to: "/integrations/whatsapp",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          <SectionItem
            aside={
              <div className="p-[8px]">
                <ServiceIcon service="whatsapp-web" size={24} />
              </div>
            }
            title="WhatsApp Web"
            description={t("Unofficial connection via WhatsApp Web")}
            onClick={() =>
              navigate({
                to: "/integrations/whatsapp-web",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          <SectionItem
            aside={
              <div className="p-[8px]">
                <InstagramOutlined
                  style={{ fontSize: "24px", color: "#E1306C" }}
                />
              </div>
            }
            title="Instagram"
            description={t("Official connection via Meta API")}
            onClick={() =>
              navigate({
                to: "/integrations/instagram",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          <SectionItem
            aside={
              <div className="p-[8px]">
                <FileText className="w-[24px] h-[24px]" />
              </div>
            }
            title={t("Media pre-processing")}
            description={t("Interprets audio, images, and documents")}
            onClick={() =>
              navigate({
                to: "/integrations/media-preprocessing",
                hash: (prevHash) => prevHash!,
              })
            }
          />
        </div>
      </SectionBody>
    </>
  );
}
