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
import { LayoutTemplate } from "lucide-react";

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
    new_phone_number: t("Nuevo número de WhatsApp"),
    existing_phone_number: t("Cuenta de WhatsApp Business existente"),
    only_waba: t("Solo WABA"),
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
      <SectionHeader title={extra?.verified_name || t("Cuenta de WhatsApp")} />

      <SectionBody className="pb-[40px]">
        <SectionItem
          title={t("Plantillas de mensajes")}
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
        {/* [crm] Mock-mode banner (P2-02) */}
        {extra?.is_mock && (
          <div className="instructions">
            <p>
              {t(
                "Conexión de prueba: no envía ni recibe mensajes reales. Conectá tu número real de WhatsApp una vez que se apruebe la verificación de Meta Business.",
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
                "El token de este número venció o ya no es válido. Reconectá el número para seguir enviando y recibiendo mensajes.",
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
              {t("Reconectar")}
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
                    "La calidad de este número es baja. Meta puede limitar o restringir el envío de mensajes si no mejora.",
                  )
                : t(
                    "La calidad de este número es media. Revisá el contenido y la frecuencia de tus mensajes.",
                  )}
            </p>
          </div>
        )}
        <form>
          <label>
            <div className="label">{t("Nombre verificado")}</div>
            <input
              type="text"
              className="text"
              value={extra?.verified_name || t("Sin nombre")}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("Número de teléfono")}</div>
            <input
              type="tel"
              className="text"
              value={formatPhoneNumber(extra?.phone_number || "")}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("Tipo de integración")}</div>
            <input
              type="text"
              className="text"
              value={flowType ? flowTypeLabels[flowType] || flowType : ""}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("ID de número")}</div>
            <input
              type="text"
              className="text"
              value={integration.address}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("ID de WABA")}</div>
            <input
              type="text"
              className="text"
              value={extra?.waba_id}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("Estado")}</div>
            <input
              type="text"
              className="text capitalize"
              value={
                integration.status === "connected"
                  ? t("Conectado")
                  : t("Desconectado")
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
                "Sobrescribir la URL de callback es útil para evadir OpenBSP y recibir los webhooks crudos en el endpoint que indiques. OpenBSP seguirá recibiendo los eventos de cuenta y plantillas (no se pueden redirigir), pero no recibirá los mensajes.",
              )}
            </p>
          </div>

          <label>
            <div className="label">{t("URL de callback")}</div>
            <input
              type="text"
              className="text"
              value={extra?.callback_url || ""}
              placeholder={t("Sin sobrescribir")}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("Verify token")}</div>
            <input
              type="text"
              className="text"
              value={extra?.verify_token || ""}
              placeholder={t("Sin sobrescribir")}
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
              disabledReason={t("Requiere permisos de administrador")}
              loading={disconnect.isPending}
            >
              {t("Desconectar")}
            </Button>
          )}

          {/* Coexistence disconnect instructions */}
          {showInstructions && (
            <div className="instructions">
              <p>
                {t(
                  "La cuenta debe ser desvinculada desde la aplicación móvil de WhatsApp Business:",
                )}
              </p>
              <ol>
                <li>{t("Abrí la aplicación WhatsApp Business")}</li>
                <li>{t("Andá a Ajustes > Cuenta > Plataforma de negocio")}</li>
                <li>
                  {t('Tocá la plataforma conectada y seleccioná "Desconectar"')}
                </li>
              </ol>
            </div>
          )}
        </form>
      </SectionBody>
    </>
  );
}
