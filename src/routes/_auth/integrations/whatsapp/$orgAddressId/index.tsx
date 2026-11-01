import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useOrganizationAddress } from "@/queries/useOrganizationsAddresses";
import { useWhatsAppDisconnect } from "@/queries/useWhatsAppSignup";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import { formatPhoneNumber } from "@/utils/FormatUtils";
import type { WhatsAppOrganizationAddressExtra } from "@/supabase/client";
import { useState } from "react";
import Button from "@/components/Button";
import SectionItem from "@/components/SectionItem";
import { LayoutTemplate, UserRound } from "lucide-react";
import DisplayNameSection from "@/components/DisplayNameSection";

export const Route = createFileRoute(
  "/_auth/integrations/whatsapp/$orgAddressId/",
)({
  component: WhatsAppDetails,
});

function WhatsAppDetails() {
  const { orgAddressId } = Route.useParams();
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: integration } = useOrganizationAddress(orgAddressId);
  const disconnect = useWhatsAppDisconnect();
  const { data: agent } = useCurrentAgent();
  const [showInstructions, setShowInstructions] = useState(false);

  if (!integration) return;

  // Admin+, or the member whose own account this is: a user-scoped address
  // carries their agent_id, the organization's carries none.
  const canManage =
    ["admin", "owner"].includes(agent?.role || "") ||
    (!!integration.agent_id && integration.agent_id === agent?.id);

  const extra = integration.extra as
    | WhatsAppOrganizationAddressExtra
    | undefined;
  const flowType = extra?.flow_type;
  const isCoexistence = flowType === "existing_phone_number";

  const flowTypeLabels: Record<string, string> = {
    new_phone_number: t("New WhatsApp number"),
    existing_phone_number: t("Existing WhatsApp Business account"),
    only_waba: t("WABA only"),
  };

  const handleDisconnect = () => {
    if (isCoexistence) {
      setShowInstructions(true);
      return;
    }

    disconnect.mutate(
      { phone_number_id: integration.address },
      {
        onSuccess: () => {
          void navigate({ to: "/integrations/whatsapp" });
        },
      },
    );
  };

  return (
    <>
      <SectionHeader title={extra?.verified_name || t("WhatsApp account")} />

      <SectionBody className="pb-[40px]">
        <SectionItem
          title={t("Message templates")}
          aside={
            <div className="p-[8px]">
              <LayoutTemplate className="w-[24px] h-[24px] text-muted-foreground" />
            </div>
          }
          onClick={() =>
            navigate({
              to: "/integrations/whatsapp/$orgAddressId/templates",
              params: { orgAddressId },
              hash: (prevHash) => prevHash!,
            })
          }
        />
        {/* [crm] Business profile (P2-11) */}
        <SectionItem
          title={t("Business profile")}
          aside={
            <div className="p-[8px]">
              <UserRound className="w-[24px] h-[24px] text-muted-foreground" />
            </div>
          }
          onClick={() =>
            navigate({
              to: "/integrations/whatsapp/$orgAddressId/profile",
              params: { orgAddressId },
              hash: (prevHash) => prevHash!,
            })
          }
        />
        {/* [crm] Mock-mode banner (P2-02) */}
        {extra?.is_mock && (
          <div className="instructions">
            <p>
              {t(
                "Test connection: doesn't send or receive real messages. Connect your real WhatsApp number once Meta Business Verification is approved.",
              )}
            </p>
          </div>
        )}
        {/* [crm] Needs-reconnect banner (P2-03): no refresh endpoint exists
        for this token type, so the only fix is reconnecting. */}
        {extra?.needs_reauth && (
          <div className="instructions">
            <p className="text-destructive font-medium">
              {t(
                "This number's token has expired or is no longer valid. Reconnect the number to keep sending and receiving messages.",
              )}
            </p>
            <Button
              className="secondary"
              onClick={() =>
                navigate({
                  to: "/integrations/whatsapp/new",
                  hash: (prevHash) => prevHash!,
                })
              }
            >
              {t("Reconnect")}
            </Button>
          </div>
        )}
        {/* [crm] Quality/limit banner (P2-10): quality has no fix button --
        unlike a reconnect, it's not something to click your way out of,
        only something to watch and improve response rates/content over
        time. */}
        {(extra?.quality_rating === "RED" ||
          extra?.quality_rating === "YELLOW") && (
          <div className="instructions">
            <p
              className={
                extra.quality_rating === "RED"
                  ? "text-destructive font-medium"
                  : "text-yellow-700 dark:text-yellow-400 font-medium"
              }
            >
              {extra.quality_rating === "RED"
                ? t(
                    "This number's quality is poor. Meta may limit or restrict sending if it doesn't improve.",
                  )
                : t(
                    "This number's quality is medium. Review your message content and frequency.",
                  )}
            </p>
          </div>
        )}
        <form>
          {/* [crm] P2-11 */}
          <DisplayNameSection address={integration.address} extra={extra} />

          <label>
            <div className="label">{t("Phone number")}</div>
            <input
              type="tel"
              className="text"
              value={formatPhoneNumber(extra?.phone_number || "")}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("Integration type")}</div>
            <input
              type="text"
              className="text"
              value={flowType ? flowTypeLabels[flowType] || flowType : ""}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("Number ID")}</div>
            <input
              type="text"
              className="text"
              value={integration.address}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("WABA ID")}</div>
            <input
              type="text"
              className="text"
              value={extra?.waba_id}
              readOnly
            />
          </label>

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

          {/* [crm] The WABA access token field that used to render here was
          removed (P2-02): the token moved to Supabase Vault and is never
          sent to the browser. */}

          <div className="instructions">
            <p>
              {t(
                "Overriding the callback URL is useful to bypass OpenBSP and receive raw webhooks at the endpoint you specify. OpenBSP will keep receiving account and template events (these cannot be redirected), but it will not receive any messages.",
              )}
            </p>
          </div>

          <label>
            <div className="label">{t("Callback URL")}</div>
            <input
              type="text"
              className="text"
              value={extra?.callback_url || ""}
              placeholder={t("Not overridden")}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("Verify token")}</div>
            <input
              type="text"
              className="text"
              value={extra?.verify_token || ""}
              placeholder={t("Not overridden")}
              readOnly
            />
          </label>

          {/* Disconnect button */}
          {integration.status === "connected" && !showInstructions && (
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

          {/* Coexistence disconnect instructions */}
          {showInstructions && (
            <div className="instructions">
              <p>
                {t(
                  "The account must be unlinked from the WhatsApp Business mobile app:",
                )}
              </p>
              <ol>
                <li>{t("Open the WhatsApp Business app")}</li>
                <li>{t("Go to Settings > Account > Business Platform")}</li>
                <li>
                  {t('Tap the connected platform and select "Disconnect"')}
                </li>
              </ol>
            </div>
          )}
        </form>
      </SectionBody>
    </>
  );
}
