import { useContext, useEffect, useState } from "react";
import {
  isMockWhatsAppSignup,
  WhatsAppIntegrationContext,
  type SignupOptions,
} from "@/contexts/WhatsAppIntegrationContext";
import useBoundStore from "@/stores/useBoundStore";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";

export default function WhatsAppIntegration({
  onSuccess,
  signupOptions,
  // Whether the caller may connect at the scope they picked; see
  // useConnectionScope. Defaults to allowed for the third-party onboarding
  // flow, which has no member to ask about.
  allowed = true,
}: {
  onSuccess?: (phone_number_id: string) => void;
  signupOptions?: SignupOptions;
  allowed?: boolean;
}) {
  const { translate: t } = useTranslation();
  const context = useContext(WhatsAppIntegrationContext);
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const [loading, setLoading] = useState(false);
  // The Facebook SDK loads asynchronously from connect.facebook.net, which is
  // commonly blocked by tracking protection / ad blockers. If it fails to load,
  // show the error up front instead of a button that cannot work.
  const [sdkFailed, setSdkFailed] = useState(() => !!window.__fbSdkFailed);

  useEffect(() => {
    const onFail = () => setSdkFailed(true);
    window.addEventListener("fb-sdk-failed", onFail);
    return () => window.removeEventListener("fb-sdk-failed", onFail);
  }, []);

  if (!context?.launchWhatsAppSignup) return null;

  // [crm] Mock mode (P2-02): VITE_META_APP_ID=mock, before Meta Business
  // Verification clears, never touches the real Facebook SDK, so the
  // sdkFailed guard below is irrelevant here -- and there is no single
  // "connect" outcome to simulate, so this renders two buttons instead of
  // one.
  if (isMockWhatsAppSignup) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">
          {t(
            "Modo de prueba: no se abrirá Facebook ni se conectará un número real.",
          )}
        </p>
        <Button
          disabled={!orgId || !allowed}
          disabledReason={
            !allowed ? t("Requiere permisos de administrador") : undefined
          }
          loading={loading}
          className="primary w-full"
          onClick={() =>
            context.launchWhatsAppSignup(
              onSuccess || (() => {}),
              setLoading,
              signupOptions,
              "success",
            )
          }
        >
          {t("Simular conexión exitosa")}
        </Button>
        <Button
          disabled={!orgId || !allowed}
          disabledReason={
            !allowed ? t("Requiere permisos de administrador") : undefined
          }
          loading={loading}
          className="secondary w-full"
          onClick={() =>
            context.launchWhatsAppSignup(
              onSuccess || (() => {}),
              setLoading,
              signupOptions,
              "error",
            )
          }
        >
          {t("Simular error de conexión")}
        </Button>
      </div>
    );
  }

  const sdkErrorMessage = t(
    "No se pudo cargar el SDK de Facebook. Desactivá la protección contra rastreo o el bloqueador de anuncios para este sitio, o probá con otro navegador.",
  );

  return (
    <div className="flex flex-col gap-2">
      {sdkFailed && (
        <p className="text-destructive font-medium">{sdkErrorMessage}</p>
      )}
      <Button
        disabled={!orgId || !allowed || sdkFailed}
        disabledReason={
          sdkFailed
            ? sdkErrorMessage
            : !allowed
              ? t("Requiere permisos de administrador")
              : undefined
        }
        loading={loading}
        className="primary bg-[#4267b2] hover:bg-[#4267b2]/90 text-white w-full"
        onClick={() =>
          context.launchWhatsAppSignup(
            onSuccess || (() => {}),
            setLoading,
            signupOptions,
          )
        }
      >
        {t("Continuar con Facebook")}
      </Button>
    </div>
  );
}
