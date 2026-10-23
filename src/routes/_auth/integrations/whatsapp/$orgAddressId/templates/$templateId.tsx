import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import { useTranslation } from "@/hooks/useTranslation";
import TemplateEditor from "@/components/TemplateEditor";
import { useTemplates, useDeleteTemplate } from "@/queries/useTemplates";
import { LoaderCircle, Languages } from "lucide-react";
import SectionItem from "@/components/SectionItem";

export const Route = createFileRoute(
  "/_auth/integrations/whatsapp/$orgAddressId/templates/$templateId",
)({
  component: EditTemplate,
});

function EditTemplate() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { orgAddressId, templateId } = Route.useParams();

  const { data: templates, isLoading } = useTemplates(orgAddressId);
  const deleteTemplate = useDeleteTemplate();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const template = templates?.find((t) => t.id === templateId);

  if (!template) {
    return (
      <div className="p-4 text-muted-foreground">
        {t("Plantilla no encontrada")}
      </div>
    );
  }

  return (
    <>
      <SectionHeader
        title={t("Editar plantilla")}
        onDelete={() => {
          deleteTemplate.mutate(
            { template, organizationAddress: orgAddressId },
            {
              onSuccess: () =>
                navigate({ to: "..", hash: (prevHash) => prevHash! }),
            },
          );
        }}
        deleteLoading={deleteTemplate.isPending}
      />
      {/* [crm] P2-04: Meta templates with the same name in a different
      language are separate objects -- this starts a new one pre-filled
      with this template's name/category. */}
      <SectionItem
        title={t("Agregar idioma")}
        description={t("Crear esta plantilla en otro idioma")}
        aside={
          <div className="p-[8px]">
            <Languages className="w-[24px] h-[24px] text-muted-foreground" />
          </div>
        }
        onClick={() =>
          navigate({
            to: "/integrations/whatsapp/$orgAddressId/templates/new",
            params: { orgAddressId },
            search: { name: template.name, category: template.category },
            hash: (prevHash) => prevHash!,
          })
        }
      />
      <TemplateEditor
        existingTemplate={template}
        organizationAddress={orgAddressId}
      />
    </>
  );
}
