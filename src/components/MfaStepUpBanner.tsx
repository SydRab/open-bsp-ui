// [crm] 2FA step-up (P1-11): shown instead of silently hiding every
// admin/owner action when the organization requires 2FA and the session is
// only aal1 — crm.needs_mfa_step_up is true for exactly that case.
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useNeedsMfaStepUp } from "@/queries/useCrm";
import MfaStepUpModal from "./MfaStepUpModal";

export default function MfaStepUpBanner() {
  const { translate: t } = useTranslation();
  const { data: needsStepUp } = useNeedsMfaStepUp();
  const [open, setOpen] = useState(false);

  if (!needsStepUp) return null;

  return (
    <div role="alert" className="flex flex-col">
      <div className="flex items-center gap-[12px] px-[16px] py-[8px] text-[14px] bg-primary text-primary-foreground">
        <ShieldAlert className="w-[18px] h-[18px] shrink-0" />
        <div className="grow min-w-0">
          {t(
            "Esta organización exige verificación en dos pasos para tu rol. Verifícate para ver y usar las funciones de administración.",
          )}
        </div>
        <button
          className="shrink-0 underline font-medium"
          onClick={() => setOpen(true)}
        >
          {t("Verificar")}
        </button>
      </div>
      {open && (
        <MfaStepUpModal
          onClose={() => setOpen(false)}
          onVerified={() => setOpen(false)}
        />
      )}
    </div>
  );
}
