// [crm] P4-03: segments list. crm.filter_contacts'/crm.segments' own
// permission gate (broadcasts.create) is the only access control here --
// mirrors Custom fields' "list from the hook, click through to edit" shape.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListFilter, RefreshCw } from "lucide-react";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useMyPermissions, useSegments } from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/segments/")({
  component: ListSegments,
});

function ListSegments() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: segments } = useSegments();
  const { can } = useMyPermissions();
  const canManage = can("broadcasts.create");

  return (
    <>
      <SectionHeader title={t("Segments")} />

      <SectionBody>
        {(segments ?? []).length === 0 && (
          <div className="text-[13px] text-muted-foreground px-[6px]">
            {t("No segments yet.")}
          </div>
        )}
        {(segments ?? []).map((segment) => (
          <SectionItem
            key={segment.id}
            title={segment.name}
            description={[
              segment.type === "static" ? t("Static") : t("Dynamic"),
              segment.criteria.length === 0
                ? t("no conditions")
                : `${segment.criteria.length} ${t("conditions")}`,
            ].join(" · ")}
            aside={
              <div className="p-[8px]">
                {segment.type === "static" ? (
                  <ListFilter className="w-[22px] h-[22px] text-muted-foreground" />
                ) : (
                  <RefreshCw className="w-[22px] h-[22px] text-muted-foreground" />
                )}
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/segments/$segmentId",
                params: { segmentId: segment.id },
                hash: (prevHash) => prevHash!,
              })
            }
          />
        ))}
      </SectionBody>

      {canManage && (
        <SectionFooter>
          <Button
            type="button"
            className="primary"
            onClick={() =>
              navigate({
                to: "/settings/segments/new",
                hash: (prevHash) => prevHash!,
              })
            }
          >
            {t("New segment")}
          </Button>
        </SectionFooter>
      )}
    </>
  );
}
