// [crm] Business details (P1-07): legal name, address, support contact and
// registration numbers, shown on public pages and receipts. Shown on the
// organization settings page; the database checks formats (GSTIN, SEBI…)
// and permissions (organization.manage).
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type BusinessDetails,
  type Registration,
  useMyPermissions,
  useOrgProfile,
  useUpdateBusinessDetails,
} from "@/queries/useCrm";

const REGISTRATION_TYPES: { value: string; label: string }[] = [
  { value: "gstin", label: "GSTIN" },
  { value: "sebi_ra", label: "SEBI RA" },
  { value: "sebi_ia", label: "SEBI IA" },
  { value: "cin", label: "CIN" },
  { value: "udyam", label: "Udyam" },
  { value: "other", label: "Other" },
];

const ADDRESS_FIELDS: {
  key: keyof BusinessDetails["address"];
  label: string;
}[] = [
  { key: "line1", label: "Address" },
  { key: "line2", label: "Address (line 2)" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "postal_code", label: "Postal code" },
  { key: "country", label: "Country (code, e.g. IN)" },
];

export default function BusinessDetailsForm() {
  const { translate: t } = useTranslation();
  const { data: profile } = useOrgProfile();
  const { can } = useMyPermissions();
  const update = useUpdateBusinessDetails();
  const canManage = can("organization.manage");

  const { register, handleSubmit, control, reset, formState } =
    useForm<BusinessDetails>();
  const registrations = useFieldArray({ control, name: "registrations" });

  useEffect(() => {
    if (!profile) return;
    const address = (profile.address ?? {}) as Partial<
      BusinessDetails["address"]
    >;
    reset({
      legal_name: profile.legal_name ?? "",
      address: {
        line1: address.line1 ?? "",
        line2: address.line2 ?? "",
        city: address.city ?? "",
        state: address.state ?? "",
        postal_code: address.postal_code ?? "",
        country: address.country ?? "IN",
      },
      support_email: profile.support_email ?? "",
      support_phone: profile.support_phone ?? "",
      website: profile.website ?? "",
      registrations: (profile.registrations ?? []) as Registration[],
    });
  }, [profile, reset]);

  if (!profile) return null;

  return (
    <form
      id="business-details-form"
      className="flex flex-col gap-[16px]"
      onSubmit={handleSubmit((data) => update.mutate(data))}
    >
      <div className="text-[16px] text-muted-foreground">
        {t("Business details")}
      </div>

      <label>
        <div className="label">{t("Legal name")}</div>
        <input
          className="text"
          disabled={!canManage}
          {...register("legal_name")}
        />
      </label>

      {ADDRESS_FIELDS.map((field) => (
        <label key={field.key}>
          <div className="label">{t(field.label)}</div>
          <input
            className="text"
            disabled={!canManage}
            {...register(`address.${field.key}`)}
          />
        </label>
      ))}

      <label>
        <div className="label">{t("Support email")}</div>
        <input
          className="text"
          type="email"
          disabled={!canManage}
          {...register("support_email")}
        />
      </label>
      <label>
        <div className="label">{t("Support phone")}</div>
        <input
          className="text"
          type="tel"
          placeholder="+91 98765 43210"
          disabled={!canManage}
          {...register("support_phone")}
        />
      </label>
      <label>
        <div className="label">{t("Website")}</div>
        <input
          className="text"
          type="url"
          placeholder="https://"
          disabled={!canManage}
          {...register("website")}
        />
      </label>

      <div className="flex flex-col gap-[8px]">
        <div className="label">{t("Registration numbers")}</div>
        {registrations.fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-[8px]">
            <select
              className="text w-[110px]"
              disabled={!canManage}
              {...register(`registrations.${index}.type`)}
            >
              {REGISTRATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {t(type.label)}
                </option>
              ))}
            </select>
            <input
              className="text grow"
              disabled={!canManage}
              {...register(`registrations.${index}.number`)}
            />
            {canManage && (
              <button
                type="button"
                className="cursor-pointer text-muted-foreground"
                title={t("Remove")}
                onClick={() => registrations.remove(index)}
              >
                <Trash2 className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
        ))}
        {canManage && (
          <button
            type="button"
            className="flex items-center gap-[6px] text-primary font-bold cursor-pointer self-start"
            onClick={() => registrations.append({ type: "gstin", number: "" })}
          >
            <Plus className="w-[16px] h-[16px]" />
            {t("Add number")}
          </button>
        )}
        <div className="text-[12px] text-muted-foreground">
          {t(
            "Shown on your public pages and receipts, not in WhatsApp messages.",
          )}
        </div>
      </div>

      {update.error && (
        <div className="text-destructive text-[13px]">
          {update.error.message}
        </div>
      )}

      <div>
        <Button
          form="business-details-form"
          type="submit"
          disabled={!canManage}
          invalid={!formState.isDirty}
          loading={update.isPending}
          disabledReason={t("Requires permission to manage the organization")}
          className="primary"
        >
          {t("Save details")}
        </Button>
      </div>
    </form>
  );
}
