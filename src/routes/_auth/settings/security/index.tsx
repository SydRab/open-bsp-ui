// [crm] Security (P1-11): TOTP enrollment for the signed-in user, and the
// organization's require_mfa_for_admins toggle (owner only — turning it ON
// needs the owner's own session to already be aal2, crm.set_require_mfa_
// for_admins' own guard, so there is no way to lock yourself out).
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Fingerprint, Trash2 } from "lucide-react";
import Button from "@/components/Button";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import Spinner from "@/components/Spinner";
import Switch from "@/components/Switch";
import { useTranslation } from "@/hooks/useTranslation";
import { useOrgProfile, useSetRequireMfaForAdmins } from "@/queries/useCrm";
import { useCurrentAgent } from "@/queries/useAgents";
import {
  useEnrollTotp,
  useMfaFactors,
  useUnenrollMfa,
  useVerifyMfaEnrollment,
} from "@/queries/useMfa";

export const Route = createFileRoute("/_auth/settings/security/")({
  component: Security,
});

function Security() {
  const { translate: t } = useTranslation();
  const { data: factors, isLoading } = useMfaFactors();
  const { data: profile } = useOrgProfile();
  const { data: agent } = useCurrentAgent();
  const isOwner = agent?.role === "owner";
  const setRequireMfa = useSetRequireMfaForAdmins();

  const verified = factors?.find((f) => f.status === "verified");

  return (
    <>
      <SectionHeader title={t("Seguridad")} />

      <SectionBody className="gap-[24px]">
        <div className="flex flex-col gap-[8px] px-[6px]">
          <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
            {t("Verificación en dos pasos")}
          </div>
          <p className="text-[13px] text-muted-foreground">
            {t(
              "Con una app de autenticación (Google Authenticator, Authy, 1Password...), además de tu contraseña.",
            )}
          </p>

          {isLoading && (
            <div className="flex justify-center p-[16px]">
              <Spinner size={20} />
            </div>
          )}

          {!isLoading && verified && (
            <div className="flex items-center justify-between gap-[12px] py-[8px]">
              <div className="flex items-center gap-[10px]">
                <Fingerprint className="w-[20px] h-[20px] text-primary" />
                <span className="text-[15px]">
                  {t("Verificación en dos pasos activada")}
                </span>
              </div>
              <RemoveFactorButton factorId={verified.id} />
            </div>
          )}

          {!isLoading && !verified && <EnrollTotp />}
        </div>

        {isOwner && profile && (
          <div className="flex flex-col gap-[8px] px-[6px]">
            <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
              {t("Para esta organización")}
            </div>
            <label className="flex items-center justify-between gap-[16px] py-[4px]">
              <div className="min-w-0">
                <div className="text-[15px]">
                  {t(
                    "Exigir verificación en dos pasos a propietarios y administradores",
                  )}
                </div>
                {!verified && !profile.require_mfa_for_admins && (
                  <div className="text-[12px] text-muted-foreground mt-[2px]">
                    {t(
                      "Activa la tuya primero — la plataforma no te deja bloquearte a ti mismo.",
                    )}
                  </div>
                )}
              </div>
              <Switch
                checked={profile.require_mfa_for_admins}
                disabled={setRequireMfa.isPending}
                onCheckedChange={(checked) => setRequireMfa.mutate(checked)}
              />
            </label>
            {setRequireMfa.error && (
              <div className="text-destructive text-[13px]">
                {setRequireMfa.error.message}
              </div>
            )}
          </div>
        )}
      </SectionBody>
    </>
  );
}

function EnrollTotp() {
  const { translate: t } = useTranslation();
  const enroll = useEnrollTotp();
  const verify = useVerifyMfaEnrollment();
  const [code, setCode] = useState("");

  if (!enroll.data) {
    return (
      <div>
        <Button
          type="button"
          className="primary"
          loading={enroll.isPending}
          onClick={() => enroll.mutate()}
        >
          {t("Activar verificación en dos pasos")}
        </Button>
        {enroll.error && (
          <div className="text-destructive text-[13px] mt-[8px]">
            {enroll.error.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <p className="text-[13px] text-muted-foreground">
        {t(
          "Escanea este código con tu app de autenticación, o ingresa la clave manualmente.",
        )}
      </p>
      <img
        src={`data:image/svg+xml;utf-8,${encodeURIComponent(enroll.data.totp.qr_code)}`}
        alt={t("Código QR")}
        className="w-[180px] h-[180px] self-center"
      />
      <div className="font-mono text-[13px] text-center break-all text-muted-foreground">
        {enroll.data.totp.secret}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          verify.mutate({ factorId: enroll.data!.id, code });
        }}
      >
        <label>
          <div className="label">{t("Código de verificación")}</div>
          <input
            className="text"
            inputMode="numeric"
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
            {t("Confirmar")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function RemoveFactorButton({ factorId }: { factorId: string }) {
  const { translate: t } = useTranslation();
  const unenroll = useUnenrollMfa();

  return (
    <button
      type="button"
      className="p-[8px] rounded-full hover:bg-muted text-muted-foreground disabled:opacity-50"
      title={t("Quitar")}
      disabled={unenroll.isPending}
      onClick={() => {
        if (
          window.confirm(
            t(
              "¿Quitar la verificación en dos pasos? Si alguna organización la exige para tu rol, perderás acceso a sus funciones de administración hasta que la vuelvas a activar.",
            ),
          )
        )
          unenroll.mutate(factorId);
      }}
    >
      <Trash2 className="w-[18px] h-[18px]" />
    </button>
  );
}
