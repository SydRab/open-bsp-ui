import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { useCreateOrganization } from "@/queries/useOrganizations";
import useBoundStore from "@/stores/useBoundStore";
import { useForm } from "react-hook-form";
import SectionBody from "@/components/SectionBody";
import type { OrganizationInsert } from "@/supabase/client";
import SectionFooter from "@/components/SectionFooter";
import Button from "@/components/Button";

export const Route = createFileRoute("/_auth/settings/organization/new")({
  component: NewOrganization,
});

function NewOrganization() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const createOrg = useCreateOrganization();
  const setActiveOrg = useBoundStore((state) => state.ui.setActiveOrg);

  const {
    register,
    handleSubmit,
    formState: { isValid },
  } = useForm<OrganizationInsert>();

  return (
    <>
      <SectionHeader title={t("New organization")} closeButton={true} />

      <SectionBody>
        <form
          id="create-organization-form"
          onSubmit={handleSubmit((data) =>
            createOrg.mutate(data, {
              onSuccess: (org) => {
                setActiveOrg(org.id);
                void navigate({ to: "/conversations" });
              },
            }),
          )}
        >
          <p>
            {t(
              "Your organization is the workspace where you collaborate with your team.",
            )}
          </p>

          <label>
            <div className="label">{t("Name")}</div>
            <input
              className="text"
              placeholder={t("Organization name")}
              {...register("name", { required: true })}
            />
          </label>
        </form>
      </SectionBody>

      <SectionFooter>
        <Button
          form="create-organization-form"
          type="submit"
          invalid={!isValid}
          loading={createOrg.isPending}
          className="primary"
        >
          {createOrg.isPending ? "..." : t("Create")}
        </Button>
      </SectionFooter>
    </>
  );
}
