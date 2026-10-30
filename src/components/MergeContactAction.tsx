// [crm] P3-11d: merge this contact into another one. Manual only -- no
// automatic duplicate-suggestion engine, confirmed with the user: a search
// picker (the same Fuse.js search /contacts already uses) over the org's
// other addresses is enough for the roadmap line's actual ask. The backend
// (crm.merge_contacts) is the real guard against a bad pick (self-merge,
// cross-org, both sides already having their own lead) -- this component
// doesn't try to pre-filter every edge case itself.
import { useState } from "react";
import Fuse from "fuse.js";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeftRight, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useContactsAddresses } from "@/queries/useContactsAddresses";
import { useContactByAddress, useMergeContacts } from "@/queries/useCrm";
import { contactName, type ContactAddressRow } from "@/supabase/client";
import { formatPhoneNumber } from "@/utils/FormatUtils";
import Button from "@/components/Button";
import FieldError from "@/components/FieldError";

export default function MergeContactAction({
  contactId,
  service,
  address,
}: {
  contactId: string;
  service: string;
  address: string;
}) {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<ContactAddressRow | null>(null);

  const { data: rows } = useContactsAddresses();
  const { data: targetContact } = useContactByAddress(
    target?.service ?? "",
    target?.address ?? "",
  );
  const mergeContacts = useMergeContacts();

  if (!open) {
    return (
      <Button className="secondary w-full" onClick={() => setOpen(true)}>
        <ArrowLeftRight className="w-[16px] h-[16px]" />
        {t("Fusionar con otro contacto")}
      </Button>
    );
  }

  const candidates = (rows ?? []).filter(
    (r) => !(r.service === service && r.address === address),
  );
  const named = candidates.map((row) => ({
    row,
    name: contactName(row.extra),
  }));
  const fuse = new Fuse(named, {
    threshold: 0.4,
    keys: ["name", "row.address"],
  });
  const results = search ? fuse.search(search).map((r) => r.item) : [];

  function close() {
    setOpen(false);
    setSearch("");
    setTarget(null);
    mergeContacts.reset();
  }

  return (
    <div className="flex flex-col gap-[8px] p-[12px] rounded-[12px] border border-border">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-medium">
          {t("Fusionar con otro contacto")}
        </div>
        <button
          className="p-[4px] rounded-full hover:bg-muted text-muted-foreground"
          onClick={close}
        >
          <X className="w-[16px] h-[16px]" />
        </button>
      </div>

      {!target && (
        <>
          <input
            type="text"
            className="text"
            placeholder={t("Buscar contactos")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="flex flex-col max-h-[200px] overflow-y-auto">
            {results.map(({ row, name }) => (
              <button
                key={`${row.service}~${row.organization_address}~${row.address}`}
                className="text-left px-[8px] py-[6px] rounded-lg hover:bg-accent text-[14px]"
                onClick={() => setTarget(row)}
              >
                {name || t("Sin nombre")} ·{" "}
                <span className="text-muted-foreground">
                  {row.service === "whatsapp" || row.service === "whatsapp-web"
                    ? formatPhoneNumber(row.address)
                    : row.address}
                </span>
              </button>
            ))}
            {search && results.length === 0 && (
              <div className="px-[8px] py-[6px] text-[13px] text-muted-foreground">
                {t("Sin resultados para")} "{search}"
              </div>
            )}
          </div>
        </>
      )}

      {target && (
        <div className="flex flex-col gap-[8px]">
          <div className="text-[13px] text-muted-foreground">
            {t(
              "Esta dirección y sus datos se moverán al contacto que estás viendo ahora. El otro contacto se borrará. Esta acción no se puede deshacer.",
            )}
          </div>
          <div className="text-[14px]">
            {contactName(target.extra) || t("Sin nombre")} ·{" "}
            {target.service === "whatsapp" || target.service === "whatsapp-web"
              ? formatPhoneNumber(target.address)
              : target.address}
          </div>
          {mergeContacts.error && (
            <FieldError error={(mergeContacts.error as Error).message} />
          )}
          <div className="flex gap-[8px]">
            <Button
              className="secondary flex-1"
              onClick={() => setTarget(null)}
            >
              {t("Atrás")}
            </Button>
            <Button
              className="primary flex-1"
              invalid={!targetContact}
              loading={mergeContacts.isPending}
              onClick={() => {
                if (!targetContact) return;
                mergeContacts.mutate(
                  {
                    primaryContactId: contactId,
                    secondaryContactId: targetContact.id,
                  },
                  {
                    onSuccess: () => {
                      close();
                      void navigate({ to: ".", hash: (prevHash) => prevHash! });
                    },
                  },
                );
              }}
            >
              {t("Fusionar")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
