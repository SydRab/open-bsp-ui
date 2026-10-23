// [crm] P2-09d: a quick-glance contact side panel, without leaving the
// inbox. An overlay inside the center panel (same technique
// FilePreviewer.tsx already uses for attachment preview), not a new grid
// column -- _auth.tsx's layout has no third column reserved today, and this
// avoids touching its grid/resize/mobile-breakpoint logic at all.
//
// Deliberately read-only identity + the P1-06 custom fields editor (reused
// unchanged) + a link out to the full /contacts/$addressId page for
// anything else (rename, delete, synced-field details) -- not a second
// edit form for what that page already does. Tags/assignee stay in
// ChatHeader, not duplicated here.
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ExternalLink, X } from "lucide-react";
import useBoundStore from "@/stores/useBoundStore";
import { useTranslation } from "@/hooks/useTranslation";
import { useContactAddress } from "@/queries/useContactsAddresses";
import {
  type InstagramContactAddressExtra,
  contactName,
  peerAddress,
} from "@/supabase/client";
import { addressId } from "@/routes/_auth/contacts/$addressId";
import { formatPhoneNumber, nameInitials } from "@/utils/FormatUtils";
import Avatar from "./Avatar";
import ContactFieldsForm from "./ContactFieldsForm";

export default function ContactPanel() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const contactPanel = useBoundStore((store) => store.ui.contactPanel);
  const toggle = useBoundStore((store) => store.ui.toggle);
  const activeConvId = useBoundStore((store) => store.ui.activeConvId);
  const conversation = useBoundStore((store) =>
    store.chat.conversations.get(store.ui.activeConvId || ""),
  );

  useEffect(() => {
    toggle("contactPanel", false);
  }, [activeConvId, toggle]);

  const peer = peerAddress(conversation);
  const service = conversation?.service;

  const { data: contactAddress } = useContactAddress(
    conversation?.organization_address,
    service,
    peer,
  );

  if (!contactPanel || !activeConvId || !conversation || !peer || !service) {
    return null;
  }

  const igExtra =
    service === "instagram"
      ? (contactAddress?.extra as InstagramContactAddressExtra | null)
      : null;

  const name =
    contactName(contactAddress?.extra) ||
    (igExtra?.username ? `@${igExtra.username}` : undefined);

  const displayName =
    name ||
    (service === "whatsapp" || service === "whatsapp-web"
      ? formatPhoneNumber(peer)
      : peer);

  return (
    <div className="flex flex-col bg-background text-foreground z-50 absolute inset-y-0 right-0 w-full sm:w-[340px] border-l border-border shadow-lg">
      <div className="py-[8px] px-[16px] min-h-[60px] flex justify-between items-center border-b border-border">
        <span className="text-[15px] font-medium truncate">
          {t("Contacto")}
        </span>
        <button
          className="p-[8px] rounded-full hover:bg-muted"
          title={t("Cerrar")}
          onClick={() => toggle("contactPanel", false)}
        >
          <X className="w-[20px] h-[20px]" />
        </button>
      </div>

      <div className="overflow-y-auto grow p-[16px] flex flex-col gap-[16px]">
        <div className="flex flex-col items-center gap-[8px] py-[8px]">
          <Avatar
            src={igExtra?.profile_picture_url}
            fallback={nameInitials(displayName || "?")}
            size={64}
            className="bg-accent text-accent-foreground border border-border text-[22px]"
          />
          <div className="text-[16px] text-center">{displayName}</div>
          {(service === "whatsapp" || service === "whatsapp-web") && name && (
            <div className="text-[13px] text-muted-foreground">
              {formatPhoneNumber(peer)}
            </div>
          )}
        </div>

        <ContactFieldsForm service={service} address={peer} />

        <button
          className="flex items-center justify-center gap-[6px] text-[13px] text-primary hover:underline mt-[8px]"
          onClick={() =>
            navigate({
              to: "/contacts/$addressId",
              params: {
                addressId: addressId({
                  service,
                  organization_address: conversation.organization_address,
                  address: peer,
                }),
              },
            })
          }
        >
          {t("Ver contacto completo")}
          <ExternalLink className="w-[14px] h-[14px]" />
        </button>
      </div>
    </div>
  );
}
