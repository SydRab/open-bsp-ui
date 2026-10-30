import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useContactAddress,
  useDeleteContactAddress,
  useUpdateContactAddress,
} from "@/queries/useContactsAddresses";
import { useForm } from "react-hook-form";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import Button from "@/components/Button";
import {
  type ContactAddressRow,
  type WhatsAppContactAddressExtra,
  contactName,
} from "@/supabase/client";
import { formatPhoneNumber } from "@/utils/FormatUtils";
import type { Database } from "@/supabase/db_types";
import ContactFieldsForm from "@/components/ContactFieldsForm";
import ContactActivity from "@/components/ContactActivity";
import ContactTags from "@/components/ContactTags";
import MergeContactAction from "@/components/MergeContactAction";
import { useContactByAddress, useMyPermissions } from "@/queries/useCrm";

type Service = Database["public"]["Enums"]["service"];

// The row's PK within the org, as one path segment. Safe to join on "~":
// services are a closed set and no service mints addresses containing it.
export function addressId(
  row: Pick<ContactAddressRow, "service" | "organization_address" | "address">,
): string {
  return [row.service, row.organization_address, row.address].join("~");
}

export const Route = createFileRoute("/_auth/contacts/$addressId")({
  component: ContactDetail,
});

function ContactDetail() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { addressId } = Route.useParams();
  const [service, orgAddress, ...rest] = addressId.split("~");
  const address = rest.join("~");

  const { data: entry } = useContactAddress(
    orgAddress,
    service as Service,
    address,
  );
  // [crm] P3-11b: the contact's own id, for the tags section.
  const { data: contact } = useContactByAddress(service, address);
  const deleteAddress = useDeleteContactAddress();
  const updateAddress = useUpdateContactAddress();
  const { can } = useMyPermissions();

  // A synced entry mirrors the service's address book — only the service
  // writes it (RLS refuses member updates and deletes).
  const synced =
    (entry?.extra as WhatsAppContactAddressExtra | null)?.synced?.action ===
    "add";

  const name = contactName(entry?.extra);

  const {
    register,
    handleSubmit,
    formState: { isDirty, isValid },
  } = useForm<{ name: string }>({
    values: { name: name ?? "" },
  });

  return (
    entry && (
      <>
        <SectionHeader
          title={name || t("Sin nombre")}
          onDelete={
            synced
              ? undefined
              : () => {
                  deleteAddress.mutate(entry, {
                    onSuccess: () =>
                      navigate({ to: "..", hash: (prevHash) => prevHash! }),
                  });
                }
          }
          deleteLoading={deleteAddress.isPending}
        />

        <SectionBody>
          <form
            id="contact-form"
            // [crm] Don't fill the page: the Details section follows (P1-06).
            className="grow-0"
            onSubmit={handleSubmit((data) =>
              updateAddress.mutate({
                organization_address: entry.organization_address,
                service: entry.service,
                address: entry.address,
                extra: { name: data.name },
              }),
            )}
          >
            <label>
              <div className="label">
                {t("Nombre")} {synced ? "(" + t("Sincronizado") + ")" : ""}
              </div>
              <input
                type="text"
                className="text"
                placeholder={t("Nombre del contacto")}
                readOnly={synced}
                {...register("name")}
              />
            </label>

            <label>
              <div className="label">{t("Teléfono")}</div>
              <input
                type="tel"
                className="text"
                value={
                  entry.service === "whatsapp" ||
                  entry.service === "whatsapp-web"
                    ? formatPhoneNumber(entry.address)
                    : entry.address
                }
                readOnly
              />
            </label>

            <label>
              <div className="label">{t("Cuenta")}</div>
              <input
                type="text"
                className="text"
                value={
                  entry.service === "whatsapp" ||
                  entry.service === "whatsapp-web"
                    ? formatPhoneNumber(entry.organization_address)
                    : entry.organization_address
                }
                readOnly
              />
            </label>
          </form>

          {/* [crm] Custom fields (P1-06) */}
          <ContactFieldsForm service={entry.service} address={entry.address} />

          {/* [crm] P3-11b */}
          {contact && <ContactTags contactId={contact.id} />}

          {/* [crm] P3-11a */}
          <ContactActivity service={entry.service} address={entry.address} />

          {/* [crm] P3-11d */}
          {contact && can("contacts.edit") && (
            <div className="mt-[16px]">
              <MergeContactAction
                contactId={contact.id}
                service={entry.service}
                address={entry.address}
              />
            </div>
          )}
        </SectionBody>

        {!synced && (
          <SectionFooter>
            <Button
              form="contact-form"
              type="submit"
              invalid={!isValid || !isDirty}
              loading={updateAddress.isPending}
              className="primary"
            >
              {t("Actualizar")}
            </Button>
          </SectionFooter>
        )}
      </>
    )
  );
}
