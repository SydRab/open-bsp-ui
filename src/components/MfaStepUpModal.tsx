// [crm] 2FA step-up (P1-11): a focused code-entry dialog that promotes the
// session from aal1 to aal2 against an already-enrolled TOTP factor.
// Nothing to verify against if the member never enrolled — sent to Settings
// → Security instead.
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useMfaFactors, useVerifyMfaEnrollment } from "@/queries/useMfa";

export default function MfaStepUpModal({
  onClose,
  onVerified,
}: {
  onClose: () => void;
  onVerified: () => void;
}) {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: factors, isLoading } = useMfaFactors();
  const factor = factors?.find((f) => f.status === "verified");
  const verify = useVerifyMfaEnrollment();
  const [code, setCode] = useState("");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-background text-foreground rounded-xl w-[320px] p-[20px] flex flex-col gap-[16px]">
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-medium">
            {t("Verificar en dos pasos")}
          </div>
          <button
            className="p-[4px] rounded-full hover:bg-muted"
            onClick={onClose}
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        {isLoading && (
          <div className="text-[14px] text-muted-foreground">
            {t("Cargando...")}
          </div>
        )}

        {!isLoading && !factor && (
          <>
            <p className="text-[14px] text-muted-foreground">
              {t(
                "Esta organización exige verificación en dos pasos para propietarios y administradores, y todavía no la activaste.",
              )}
            </p>
            <Button
              type="button"
              className="primary"
              onClick={() => {
                onClose();
                void navigate({
                  to: "/settings/security",
                  hash: (prevHash) => prevHash!,
                });
              }}
            >
              {t("Configurar ahora")}
            </Button>
          </>
        )}

        {!isLoading && factor && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verify.mutate(
                { factorId: factor.id, code },
                { onSuccess: onVerified },
              );
            }}
          >
            <label>
              <div className="label">
                {t("Código de tu aplicación de autenticación")}
              </div>
              <input
                className="text"
                inputMode="numeric"
                autoFocus
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            {verify.error && (
              <div className="text-destructive text-[13px] mt-[6px]">
                {verify.error.message}
              </div>
            )}
            <div className="mt-[12px]">
              <Button
                type="submit"
                className="primary"
                invalid={code.trim().length < 6}
                loading={verify.isPending}
              >
                {t("Verificar")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
