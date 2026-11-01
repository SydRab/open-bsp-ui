import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { useWebhooks } from "@/queries/useWebhooks";
import { useCurrentAgent } from "@/queries/useAgents";
import SectionItem from "@/components/SectionItem";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Webhook } from "lucide-react";

export const Route = createFileRoute("/_auth/settings/webhooks/")({
  component: ListWebhooks,
});

function ListWebhooks() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: webhooks } = useWebhooks();
  const { data: currentAgent } = useCurrentAgent();
  const isOwner = currentAgent?.role === "owner";

  return (
    <>
      <SectionHeader title={t("Webhooks")} />

      <SectionBody>
        <SectionItem
          title={t("Add webhook")}
          aside={
            <div className="p-[8px] bg-primary/10 rounded-full">
              <Plus className="w-[24px] h-[24px] text-primary" />
            </div>
          }
          onClick={() =>
            navigate({
              to: "/settings/webhooks/new",
              hash: (prevHash) => prevHash!,
            })
          }
          disabled={!isOwner}
          disabledReason={t("Requires owner permissions")}
        />
        {webhooks?.map((webhook) => (
          <SectionItem
            key={webhook.id}
            title={webhook.url}
            description={`${webhook.table_name} ${webhook.operations.map((operation) => operation.toUpperCase()).join(", ")}`}
            aside={
              <div className="p-[8px]">
                <Webhook className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: `/settings/webhooks/${webhook.id}`,
                hash: (prevHash) => prevHash!,
              })
            }
          />
        ))}
      </SectionBody>
    </>
  );
}
