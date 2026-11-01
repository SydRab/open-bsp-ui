// [crm] P4-04: campaigns list. Mirrors Segments' own "list from the hook,
// click through to edit" shape. P4-06 (fan-out) doesn't exist yet, so
// every campaign here is always 'draft' or 'scheduled' -- never "sent."
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarClock, FileEdit } from "lucide-react";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useCampaigns, useMyPermissions } from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/campaigns/")({
  component: ListCampaigns,
});

function ListCampaigns() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: campaigns } = useCampaigns();
  const { can } = useMyPermissions();
  const canManage = can("broadcasts.create");

  return (
    <>
      <SectionHeader title={t("Campaigns")} />

      <SectionBody>
        {(campaigns ?? []).length === 0 && (
          <div className="text-[13px] text-muted-foreground px-[6px]">
            {t("No campaigns yet.")}
          </div>
        )}
        {(campaigns ?? []).map((campaign) => (
          <SectionItem
            key={campaign.id}
            title={campaign.name}
            description={[
              campaign.templateName,
              campaign.status === "scheduled" && campaign.scheduledAt
                ? `${t("scheduled for")} ${new Date(campaign.scheduledAt).toLocaleString()}`
                : t("draft"),
            ].join(" · ")}
            aside={
              <div className="p-[8px]">
                {campaign.status === "scheduled" ? (
                  <CalendarClock className="w-[22px] h-[22px] text-muted-foreground" />
                ) : (
                  <FileEdit className="w-[22px] h-[22px] text-muted-foreground" />
                )}
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/campaigns/$campaignId",
                params: { campaignId: campaign.id },
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
                to: "/settings/campaigns/new",
                hash: (prevHash) => prevHash!,
              })
            }
          >
            {t("New campaign")}
          </Button>
        </SectionFooter>
      )}
    </>
  );
}
