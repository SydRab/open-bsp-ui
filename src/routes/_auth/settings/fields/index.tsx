// [crm] Custom fields (P1-06): the organization's fields for contacts (and
// deals, which arrive with the pipeline). Pack fields and the organization's
// own; archived fields listed last. Defining fields needs organization.manage.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListPlus, Package, PenLine } from "lucide-react";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import Button from "@/components/Button";
import { FIELD_TYPE_LABELS } from "@/components/CustomFieldForm";
import { useTranslation } from "@/hooks/useTranslation";
import { useCustomFields, useMyPermissions } from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/fields/")({
  component: ListFields,
});

const ENTITIES = [
  { key: "contact", label: "Contactos" },
  { key: "deal", label: "Oportunidades" },
] as const;

function ListFields() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: fields } = useCustomFields();
  const { can } = useMyPermissions();

  return (
    <>
      <SectionHeader title={t("Campos personalizados")} />

      <SectionBody className="gap-[20px]">
        {ENTITIES.map((entity) => {
          const rows = (fields ?? [])
            .filter((f) => f.definition.entity === entity.key)
            .sort(
              (a, b) =>
                Number(!!a.definition.archived) -
                  Number(!!b.definition.archived) || a.sortOrder - b.sortOrder,
            );
          return (
            <div key={entity.key} className="flex flex-col gap-[4px]">
              <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide px-[6px]">
                {t(entity.label)}
              </div>
              {rows.length === 0 && (
                <div className="text-[13px] text-muted-foreground px-[6px]">
                  {entity.key === "deal"
                    ? t(
                        "Las oportunidades llegan con el embudo de ventas (fase 3).",
                      )
                    : t("Sin campos todavía.")}
                </div>
              )}
              {rows.map((f) => (
                <SectionItem
                  key={f.id}
                  className={f.definition.archived ? "opacity-50" : ""}
                  title={f.definition.label.en}
                  description={[
                    t(FIELD_TYPE_LABELS[f.definition.type]),
                    f.definition.required ? t("obligatorio") : null,
                    f.definition.archived ? t("archivado") : null,
                    f.fromPack ? t("del pack") : t("propio"),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  aside={
                    <div className="p-[8px]">
                      {f.fromPack ? (
                        <Package className="w-[22px] h-[22px] text-muted-foreground" />
                      ) : (
                        <PenLine className="w-[22px] h-[22px] text-muted-foreground" />
                      )}
                    </div>
                  }
                  onClick={() =>
                    navigate({
                      to: "/settings/fields/$fieldId",
                      params: { fieldId: f.id },
                      hash: (prevHash) => prevHash!,
                    })
                  }
                />
              ))}
            </div>
          );
        })}
      </SectionBody>

      {can("organization.manage") && (
        <SectionFooter>
          <Button
            type="button"
            className="primary flex items-center gap-[8px]"
            onClick={() =>
              navigate({
                to: "/settings/fields/new",
                hash: (prevHash) => prevHash!,
              })
            }
          >
            <ListPlus className="w-[18px] h-[18px]" />
            {t("Nuevo campo")}
          </Button>
        </SectionFooter>
      )}
    </>
  );
}
