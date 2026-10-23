// [crm] P2-11: business profile (about/address/description/email/vertical/
// websites). Profile PICTURE is a deliberate scope cut -- Meta's Resumable
// Upload API is a separate integration, not a field on this endpoint.
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import {
  BUSINESS_PROFILE_VERTICALS,
  type BusinessProfileFields,
  useUpdateWhatsAppBusinessProfile,
  useWhatsAppBusinessProfile,
} from "@/queries/useWhatsAppBusinessProfile";

export const Route = createFileRoute(
  "/_auth/integrations/whatsapp/$orgAddressId/profile/",
)({
  component: BusinessProfile,
});

const EMPTY: BusinessProfileFields = {
  about: "",
  address: "",
  description: "",
  email: "",
  vertical: "",
  websites: [],
};

function BusinessProfile() {
  const { translate: t } = useTranslation();
  const { orgAddressId } = Route.useParams();

  const { data: profile } = useWhatsAppBusinessProfile(orgAddressId);
  const update = useUpdateWhatsAppBusinessProfile(orgAddressId);

  const [draft, setDraft] = useState<BusinessProfileFields>(EMPTY);

  // Loads once the GET resolves; a later refetch (after Save) doesn't
  // overwrite an in-progress edit.
  useEffect(() => {
    if (profile) {
      setDraft({ ...EMPTY, ...profile });
    }
  }, [profile]);

  const websites = draft.websites ?? [];

  const setWebsite = (index: number, value: string) => {
    const next = [...websites];
    next[index] = value;
    setDraft({ ...draft, websites: next.filter((w) => w !== "") });
  };

  return (
    <>
      <SectionHeader title={t("Perfil de negocio")} />

      <SectionBody className="pb-[40px]">
        <form
          id="business-profile-form"
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate(draft);
          }}
        >
          <label>
            <div className="label">{t("Acerca de")}</div>
            <input
              type="text"
              className="text"
              maxLength={139}
              value={draft.about ?? ""}
              onChange={(e) => setDraft({ ...draft, about: e.target.value })}
            />
          </label>

          <label>
            <div className="label">{t("Dirección")}</div>
            <input
              type="text"
              className="text"
              maxLength={256}
              value={draft.address ?? ""}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            />
          </label>

          <label>
            <div className="label">{t("Descripción")}</div>
            <textarea
              className="text"
              maxLength={512}
              value={draft.description ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </label>

          <label>
            <div className="label">{t("Correo electrónico")}</div>
            <input
              type="email"
              className="text"
              maxLength={128}
              value={draft.email ?? ""}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </label>

          <label>
            <div className="label">{t("Categoría")}</div>
            <select
              className="text"
              value={draft.vertical ?? ""}
              onChange={(e) => setDraft({ ...draft, vertical: e.target.value })}
            >
              <option value="">{t("Sin especificar")}</option>
              {BUSINESS_PROFILE_VERTICALS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div className="label">{t("Sitio web")} 1</div>
            <input
              type="url"
              className="text"
              maxLength={256}
              value={websites[0] ?? ""}
              onChange={(e) => setWebsite(0, e.target.value)}
            />
          </label>

          <label>
            <div className="label">{t("Sitio web")} 2</div>
            <input
              type="url"
              className="text"
              maxLength={256}
              value={websites[1] ?? ""}
              onChange={(e) => setWebsite(1, e.target.value)}
            />
          </label>

          {update.error && (
            <div className="text-destructive text-[13px] mt-[8px]">
              {update.error.message}
            </div>
          )}
        </form>
      </SectionBody>

      <SectionFooter>
        <Button
          form="business-profile-form"
          type="submit"
          loading={update.isPending}
          className="primary"
        >
          {t("Guardar")}
        </Button>
      </SectionFooter>
    </>
  );
}
