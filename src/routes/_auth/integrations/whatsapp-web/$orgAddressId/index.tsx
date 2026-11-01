import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import Button from "@/components/Button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useOrganizationAddress } from "@/queries/useOrganizationsAddresses";
import {
  useWhatsAppWebHealth,
  useDisconnectWhatsAppWeb,
} from "@/queries/useWhatsAppWeb";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import { formatPhoneNumber } from "@/utils/FormatUtils";

export const Route = createFileRoute(
  "/_auth/integrations/whatsapp-web/$orgAddressId/",
)({
  component: WhatsAppWebDetails,
});

function WhatsAppWebDetails() {
  const { orgAddressId } = Route.useParams();
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: integration } = useOrganizationAddress(orgAddressId);
  const { data: health } = useWhatsAppWebHealth(orgAddressId);
  const disconnect = useDisconnectWhatsAppWeb();
  const { data: agent } = useCurrentAgent();

  if (!integration) return;

  // Admin+, or the member whose own number this is: a user-scoped address
  // carries their agent_id, the organization's carries none.
  const canManage =
    ["admin", "owner"].includes(agent?.role || "") ||
    (!!integration.agent_id && integration.agent_id === agent?.id);
  const isConnected = integration.status === "connected";

  // Durable row status is the source of truth; live health refines the label.
  const statusText = !isConnected
    ? t("Disconnected")
    : health
      ? health.connected && health.logged_in
        ? t("Connected")
        : t("Reconnecting...")
      : t("Connected");

  const handleDisconnect = () => {
    disconnect.mutate(integration.address, {
      onSuccess: () => navigate({ to: "/integrations/whatsapp-web" }),
    });
  };

  return (
    <>
      <SectionHeader title={formatPhoneNumber(integration.address)} />

      <SectionBody className="pb-[40px]">
        {/* Session-drop warning + re-pair call to action */}
        {!isConnected && (
          <div className="instructions">
            <p className="text-destructive font-medium">
              {t(
                "The session ended (logout or ban). Re-link the device to keep sending and receiving messages.",
              )}
            </p>
          </div>
        )}

        <form>
          <label>
            <div className="label">{t("Phone number")}</div>
            <input
              type="tel"
              className="text"
              value={formatPhoneNumber(integration.address)}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("Status")}</div>
            <input
              type="text"
              className="text capitalize"
              value={statusText}
              readOnly
            />
          </label>

          {!isConnected ? (
            <Button
              type="button"
              className="primary bg-[#00ADD8] hover:bg-[#00ADD8]/90 text-white px-4 py-2 rounded-full font-medium w-fit text-[14px]"
              onClick={() =>
                navigate({
                  to: "/integrations/whatsapp-web/new",
                  hash: (prevHash) => prevHash!,
                })
              }
              disabled={!canManage}
              disabledReason={t("Requires administrator permissions")}
            >
              {t("Re-link")}
            </Button>
          ) : (
            <Button
              type="button"
              className="primary bg-destructive text-primary-foreground hover:bg-destructive/80 px-4 py-2 rounded-full font-medium w-fit text-[14px]"
              onClick={handleDisconnect}
              disabled={!canManage}
              disabledReason={t("Requires administrator permissions")}
              loading={disconnect.isPending}
            >
              {t("Disconnect")}
            </Button>
          )}
        </form>
      </SectionBody>
    </>
  );
}
