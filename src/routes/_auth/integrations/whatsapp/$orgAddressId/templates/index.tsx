import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import SectionBody from "@/components/SectionBody";
import SectionItem from "@/components/SectionItem";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Plus,
  LayoutTemplate,
  LoaderCircle,
  RefreshCw,
  PackageCheck,
} from "lucide-react";
import {
  useSubmitPackTemplates,
  useSyncTemplates,
  useTemplates,
} from "@/queries/useTemplates";

export const Route = createFileRoute(
  "/_auth/integrations/whatsapp/$orgAddressId/templates/",
)({
  component: TemplatesIndex,
});

function TemplatesIndex() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { orgAddressId } = Route.useParams();

  const { data: templates, isLoading } = useTemplates(orgAddressId);
  const syncTemplates = useSyncTemplates();
  const submitPackTemplates = useSubmitPackTemplates();

  return (
    <>
      <SectionHeader title={t("Templates")} />
      <SectionBody>
        <SectionItem
          title={t("Create template")}
          aside={
            <div className="p-[8px] bg-primary/10 rounded-full">
              <Plus className="w-[24px] h-[24px] text-primary" />
            </div>
          }
          onClick={() =>
            navigate({
              to: "/integrations/whatsapp/$orgAddressId/templates/new",
              params: { orgAddressId },
              hash: (prevHash) => prevHash!,
            })
          }
        />

        <SectionItem
          title={t("Sync with Meta")}
          description={syncTemplates.isPending ? t("Syncing...") : undefined}
          aside={
            <div className="p-[8px]">
              {syncTemplates.isPending ? (
                <LoaderCircle className="w-[24px] h-[24px] text-muted-foreground animate-spin" />
              ) : (
                <RefreshCw className="w-[24px] h-[24px] text-muted-foreground" />
              )}
            </div>
          }
          onClick={() => syncTemplates.mutate(orgAddressId)}
        />

        <SectionItem
          title={t("Submit pack templates")}
          description={
            submitPackTemplates.isSuccess
              ? t(
                  "Sending in the background. Templates will appear in the list as they're created.",
                )
              : t("Create the templates suggested for your field")
          }
          aside={
            <div className="p-[8px]">
              {submitPackTemplates.isPending ? (
                <LoaderCircle className="w-[24px] h-[24px] text-muted-foreground animate-spin" />
              ) : (
                <PackageCheck className="w-[24px] h-[24px] text-muted-foreground" />
              )}
            </div>
          }
          onClick={() => submitPackTemplates.mutate(orgAddressId)}
        />

        {isLoading && (
          <div className="flex justify-center p-4">
            <LoaderCircle className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {templates?.map((template) => (
          <SectionItem
            key={template.id}
            title={template.name}
            description={
              <div className="flex gap-2 items-center">
                <span className="capitalize">
                  {template.category.toLowerCase()}
                </span>
                {template.status !== "APPROVED" && (
                  <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full capitalize">
                    {template.status.toLowerCase()}
                  </span>
                )}
                {template.quality_score &&
                  template.quality_score !== "UNKNOWN" && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {t("Quality")}: {template.quality_score.toLowerCase()}
                    </span>
                  )}
              </div>
            }
            aside={
              <div className="p-[8px] bg-muted rounded-full">
                <LayoutTemplate className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/integrations/whatsapp/$orgAddressId/templates/$templateId",
                params: { orgAddressId, templateId: template.id },
                hash: (prevHash) => prevHash!,
              })
            }
          />
        ))}

        {!isLoading && templates?.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {t("No templates available.")}
          </div>
        )}
      </SectionBody>
    </>
  );
}
