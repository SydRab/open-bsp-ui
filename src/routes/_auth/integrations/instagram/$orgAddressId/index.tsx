import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import SectionBody from "@/components/SectionBody";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useOrganizationAddress } from "@/queries/useOrganizationsAddresses";
import { useInstagramDisconnect } from "@/queries/useInstagramSignup";
import { useCurrentAgent } from "@/queries/useAgents";
import type { InstagramOrganizationAddressExtra } from "@/supabase/client";

export const Route = createFileRoute(
  "/_auth/integrations/instagram/$orgAddressId/",
)({
  component: InstagramAddressDetail,
});

function InstagramAddressDetail() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { orgAddressId } = Route.useParams();
  const { data: integration } = useOrganizationAddress(orgAddressId);
  const disconnect = useInstagramDisconnect();
  const { data: agent } = useCurrentAgent();

  if (!integration) return;

  // Admin+, or the member whose own account this is: a user-scoped address
  // carries their agent_id, the organization's carries none.
  const canManage =
    ["admin", "owner"].includes(agent?.role || "") ||
    (!!integration.agent_id && integration.agent_id === agent?.id);
  const extra = integration.extra as
    | InstagramOrganizationAddressExtra
    | undefined;

  const handleDisconnect = () => {
    disconnect.mutate(
      { ig_user_id: integration.address },
      {
        onSuccess: () => navigate({ to: "/integrations/instagram" }),
      },
    );
  };

  return (
    <>
      <SectionHeader
        title={
          extra?.username
            ? `@${extra.username}`
            : extra?.name || t("Instagram account")
        }
      />

      <SectionBody className="pb-[40px]">
        <form>
          {extra?.name && (
            <label>
              <div className="label">{t("Name")}</div>
              <input type="text" className="text" value={extra.name} readOnly />
            </label>
          )}

          <label>
            <div className="label">{t("User")}</div>
            <input
              type="text"
              className="text"
              value={extra?.username ? `@${extra.username}` : ""}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("Account ID")}</div>
            <input
              type="text"
              className="text"
              value={integration.address}
              readOnly
            />
          </label>

          {extra?.token_expires_at && (
            <label>
              <div className="label">{t("Access expires")}</div>
              <input
                type="text"
                className="text"
                value={new Date(extra.token_expires_at).toLocaleString()}
                readOnly
              />
            </label>
          )}

          <label>
            <div className="label">{t("Status")}</div>
            <input
              type="text"
              className="text capitalize"
              value={
                integration.status === "connected"
                  ? t("Connected")
                  : t("Disconnected")
              }
              readOnly
            />
          </label>

          {extra?.needs_reauth && (
            <div className="instructions">
              <p className="text-destructive">
                {t(
                  "The connection expired or was revoked. Reconnect the account.",
                )}
              </p>
            </div>
          )}

          {integration.status === "connected" && (
            <Button
              type="button"
              className="primary bg-destructive text-primary-foreground hover:bg-destructive/80 px-4 py-2 rounded-full font-medium transition-colors w-fit text-[14px]"
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
