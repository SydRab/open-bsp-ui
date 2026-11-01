import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import SectionHeader from "@/components/SectionHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { useCreateContactAddress } from "@/queries/useContactsAddresses";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import { useForm } from "react-hook-form";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import Button from "@/components/Button";
import {
  formatPhoneNumber,
  isValidPhoneNumber,
  normalizePhoneNumber,
} from "@/utils/FormatUtils";
import FieldError from "@/components/FieldError";
import type {
  OrganizationAddressRow,
  WhatsAppOrganizationAddressExtra,
} from "@/supabase/client";
import { addressId } from "./$addressId";

export const Route = createFileRoute("/_auth/contacts/new")({
  component: ContactNew,
});

function ContactNew() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const createAddress = useCreateContactAddress();
  const { data: orgAddresses } = useOrganizationsAddresses();

  // An entry belongs to ONE connection's address book, so creating one names
  // the connection. A hand-added contact is a phone-book entry: WhatsApp only.
  const accounts = (orgAddresses ?? []).filter(
    (a) => a.service === "whatsapp" || a.service === "whatsapp-web",
  );

  // Derived rather than stored: the accounts arrive with a query, and an
  // initial state would keep whatever was true before they landed. The same
  // digits can be a whatsapp AND a whatsapp-web connection, so the key names
  // the service too.
  const accountKey = (a: OrganizationAddressRow) => `${a.service}~${a.address}`;
  const [chosen, setChosen] = useState<string | null>(null);
  const chosenKey = chosen ?? (accounts[0] && accountKey(accounts[0]));
  const account = accounts.find((a) => accountKey(a) === chosenKey);

  const {
    register,
    handleSubmit,
    formState: { isValid, isDirty, errors },
  } = useForm<{ name: string; address: string }>({
    mode: "onTouched",
    defaultValues: { name: "", address: "" },
  });

  return (
    <>
      <SectionHeader title={t("New contact")} />

      <SectionBody>
        <form
          id="contact-form"
          onSubmit={handleSubmit((data) => {
            if (!account) return;
            createAddress.mutate(
              {
                organization_address: account.address,
                service: account.service,
                address: normalizePhoneNumber(data.address),
                extra: data.name ? { name: data.name } : null,
              },
              {
                onSuccess: (row) =>
                  navigate({
                    to: "/contacts/$addressId",
                    params: { addressId: addressId(row) },
                    hash: (prevHash) => prevHash!,
                  }),
              },
            );
          })}
        >
          <label>
            <div className="label">{t("Name")}</div>
            <input
              type="text"
              className="text"
              placeholder={t("Contact name")}
              {...register("name")}
            />
          </label>

          <label>
            <div className="label">{t("Phone")}</div>
            <input
              type="tel"
              className={`text ${errors.address ? "border-destructive" : ""}`}
              placeholder={t("+91 98765 43210")}
              {...register("address", {
                required: true,
                validate: (value) =>
                  isValidPhoneNumber(value) || t("Invalid number"),
              })}
            />
            <FieldError error={errors.address} />
          </label>

          {accounts.length > 1 && (
            <label>
              <div className="label">{t("Account")}</div>
              <select
                className="text"
                value={chosenKey || ""}
                onChange={(e) => setChosen(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={accountKey(a)} value={accountKey(a)}>
                    {(a.extra as WhatsAppOrganizationAddressExtra | null)
                      ?.verified_name || formatPhoneNumber(a.address)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </form>
      </SectionBody>

      <SectionFooter>
        <Button
          form="contact-form"
          type="submit"
          invalid={!isValid || !isDirty || !account}
          loading={createAddress.isPending}
          className="primary"
        >
          {t("Create")}
        </Button>
      </SectionFooter>
    </>
  );
}
