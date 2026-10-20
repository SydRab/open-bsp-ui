import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionFooter from "@/components/SectionFooter";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useCurrentOrganization,
  useUpdateCurrentOrganization,
} from "@/queries/useOrganizations";
// [crm] Profile fields, and deletion as a request with a grace period.
import { useMyPermissions, useRequestOrgDeletion } from "@/queries/useCrm";
import OrgProfileForm from "@/components/OrgProfileForm";
import BusinessDetailsForm from "@/components/BusinessDetailsForm";
import { useCurrentAgent } from "@/queries/useAgents";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useMemo } from "react";
import useBoundStore from "@/stores/useBoundStore";
import Button from "@/components/Button";
import SelectField from "@/components/SelectField";
import { type OrganizationUpdate } from "@/supabase/client";

export const Route = createFileRoute("/_auth/settings/organization/")({
  beforeLoad: () => {
    const activeOrgId = useBoundStore.getState().ui.activeOrgId;
    if (!activeOrgId) {
      throw redirect({
        to: "/settings/organization/new",
      });
    }
  },
  component: EditOrganization,
});

function EditOrganization() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: org } = useCurrentOrganization();
  const { data: agent } = useCurrentAgent();
  // Admins run the organization — the whole row, name included. Deleting it is
  // the owner's, like every other way of taking control.
  const { can } = useMyPermissions();
  const isAdmin =
    ["admin", "owner"].includes(agent?.role || "") &&
    can("organization.manage");
  const canDelete = can("organization.delete");
  const setActiveOrg = useBoundStore((state) => state.ui.setActiveOrg);
  const updateOrg = useUpdateCurrentOrganization();
  const deleteOrg = useRequestOrgDeletion();

  const normalizedOrg = useMemo(() => {
    if (!org) return undefined;
    return {
      ...org,
      extra: {
        ...org.extra,
        error_messages_direction:
          org.extra?.error_messages_direction || "internal",
      },
    };
  }, [org]);

  const {
    register,
    handleSubmit,
    control,
    formState: { isValid, isDirty },
  } = useForm<OrganizationUpdate>({ values: normalizedOrg });

  return (
    <>
      <SectionHeader
        title={t("Editar organización")}
        onDelete={() => {
          if (
            !window.confirm(
              t(
                "La organización dejará de estar accesible de inmediato y se eliminará definitivamente en 30 días. Un propietario puede cancelarlo antes. ¿Continuar?",
              ),
            )
          )
            return;
          deleteOrg.mutate(undefined, {
            onSuccess: () => {
              setActiveOrg(null);
              void navigate({ to: "/conversations" });
            },
          });
        }}
        deleteDisabled={!canDelete}
        deleteDisabledReason={t("Requiere permisos de propietario")}
        deleteLoading={deleteOrg.isPending}
      />

      <SectionBody>
        <form
          id="org-form"
          onSubmit={handleSubmit((data) => updateOrg.mutate(data))}
        >
          <label>
            <div className="label">{t("Nombre")}</div>
            <input
              className="text"
              placeholder={t("Nombre de la organización")}
              disabled={!isAdmin}
              {...register("name", { required: true })}
            />
          </label>

          <SelectField
            control={control}
            name="extra.error_messages_direction"
            label={t("Mensajes de error")}
            options={[
              { value: "internal", label: t("Solo en la UI") },
              { value: "outgoing", label: t("Visible desde WhatsApp") },
            ]}
            disabled={!isAdmin}
          />
        </form>

        <OrgProfileForm />

        {/* [crm] Business details (P1-07) */}
        <BusinessDetailsForm />
      </SectionBody>

      <SectionFooter>
        <Button
          form="org-form"
          type="submit"
          disabled={!isAdmin}
          invalid={!isValid || !isDirty}
          loading={updateOrg.isPending}
          disabledReason={t("Requiere permisos de administrador")}
          className="primary"
        >
          {t("Actualizar")}
        </Button>
      </SectionFooter>
    </>
  );
}
