// [crm] P4-01: the consent ledger's per-contact half -- a history list
// (crm.contacts_consent's own RLS already permits this read, P2-05, no
// new function needed) plus a manual "record consent" action
// (crm.set_contact_consent, extended this task with an optional p_note --
// the "proof text/URL/form id" the roadmap line asks for; one free-text
// field covers all three equally well, so no new column was added).
import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useContactConsentHistory,
  useSetContactConsent,
  type ConsentEvent,
} from "@/queries/useCrm";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";

const STATUS_LABELS: Record<string, string> = {
  opted_in: "Opt-in",
  opted_out: "Opt-out",
};

const SOURCE_LABELS: Record<string, string> = {
  keyword: "Palabra clave",
  admin: "Manual",
  signup_default: "Alta",
  api: "API",
  csv_import: "Importación CSV",
};

export default function ContactConsent({
  organizationAddress,
  service,
  address,
}: {
  organizationAddress: string;
  service: string;
  address: string;
}) {
  const { translate: t } = useTranslation();
  const { data: events, isLoading } = useContactConsentHistory(
    organizationAddress,
    service,
    address,
  );
  const setContactConsent = useSetContactConsent();

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"opted_in" | "opted_out">("opted_in");
  const [note, setNote] = useState("");

  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  function save() {
    setContactConsent.mutate(
      {
        organizationAddress,
        service: service as "whatsapp" | "whatsapp-web",
        address,
        status,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setNote("");
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-[8px] mt-[16px]">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
          {t("Consentimiento")}
        </div>
        <button
          className="p-[4px] rounded-full cursor-pointer hover:bg-accent text-muted-foreground"
          title={t("Registrar consentimiento")}
          onClick={() => setOpen((v) => !v)}
        >
          <Plus className="w-[16px] h-[16px]" />
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-[8px] p-[12px] rounded-[12px] border border-border">
          <label>
            <div className="label">{t("Estado")}</div>
            <select
              className="text"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "opted_in" | "opted_out")
              }
            >
              <option value="opted_in">{t("Opt-in")}</option>
              <option value="opted_out">{t("Opt-out")}</option>
            </select>
          </label>
          <label>
            <div className="label">{t("Prueba (opcional)")}</div>
            <input
              type="text"
              className="text"
              placeholder={t("Texto, URL, o id de formulario")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="flex gap-[8px]">
            <Button className="secondary flex-1" onClick={() => setOpen(false)}>
              {t("Cancelar")}
            </Button>
            <Button
              className="primary flex-1"
              loading={setContactConsent.isPending}
              onClick={save}
            >
              {t("Guardar")}
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center p-[8px]">
          <Spinner size={16} />
        </div>
      )}
      {!isLoading && (events ?? []).length === 0 && (
        <div className="text-[13px] text-muted-foreground">
          {t("Sin registros de consentimiento.")}
        </div>
      )}
      {(events ?? []).map((e: ConsentEvent) => (
        <div key={e.id} className="text-[13px] flex flex-col gap-[2px]">
          <div>
            <span className="font-medium">
              {STATUS_LABELS[e.status] ?? e.status}
            </span>
            {" · "}
            <span className="text-muted-foreground">
              {t(SOURCE_LABELS[e.source] ?? e.source)}
            </span>
            {" · "}
            <span className="text-muted-foreground">
              {formatTime(e.created_at)}
            </span>
          </div>
          {e.note && <div className="text-muted-foreground">{e.note}</div>}
        </div>
      ))}
    </div>
  );
}
