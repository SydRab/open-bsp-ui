import { createFileRoute } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import { useTranslation } from "@/hooks/useTranslation";
import TemplateEditor from "@/components/TemplateEditor";

export const Route = createFileRoute(
  "/_auth/integrations/whatsapp/$orgAddressId/templates/new",
)({
  // [crm] P2-04: "Add language" (from the template detail page) lands here
  // with the existing template's name/category pre-filled -- a new
  // template object, not an edit, since Meta has no dedicated
  // "add a language variant" call.
  validateSearch: (
    search,
  ): { name?: string; category?: "MARKETING" | "UTILITY" } => ({
    name: (search.name as string) || undefined,
    category:
      search.category === "MARKETING" || search.category === "UTILITY"
        ? search.category
        : undefined,
  }),
  component: NewTemplate,
});

function NewTemplate() {
  const { translate: t } = useTranslation();
  const { orgAddressId } = Route.useParams();
  const { name, category } = Route.useSearch();

  return (
    <>
      <SectionHeader title={t("Crear plantilla")} />
      <TemplateEditor
        organizationAddress={orgAddressId}
        prefillName={name}
        prefillCategory={category}
      />
    </>
  );
}
