// [crm] P4-04: edit a campaign. The number and template are fixed at
// creation (crm.update_campaign only takes name/segment/variable_mapping)
// -- same "pick it once" precedent segments' type and custom fields'
// entity already established; swapping either is a new campaign.
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import Button from "@/components/Button";
import CampaignVariableMapper from "@/components/CampaignVariableMapper";
import { useTranslation } from "@/hooks/useTranslation";
import { useTemplates } from "@/queries/useTemplates";
import {
  type CampaignVariableMapping,
  useCampaigns,
  useCustomFields,
  useDeleteCampaign,
  useEstimateCampaignCost,
  useScheduleCampaign,
  useSegments,
  useSendTestCampaignMessage,
  useUnscheduleCampaign,
  useUpdateCampaign,
} from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/campaigns/$campaignId")({
  component: EditCampaign,
});

function EditCampaign() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { campaignId } = Route.useParams();
  const { data: campaigns } = useCampaigns();
  const campaign = campaigns?.find((c) => c.id === campaignId);

  const { data: templates } = useTemplates(campaign?.organizationAddress);
  const template = templates?.find(
    (tpl) =>
      tpl.name === campaign?.templateName &&
      tpl.language === campaign?.templateLanguage,
  );

  const { data: segments } = useSegments();
  const { data: fields } = useCustomFields();
  const contactFields = (fields ?? []).filter(
    (f) => f.definition.entity === "contact" && !f.definition.archived,
  );
  const { data: cost } = useEstimateCampaignCost(campaignId);

  const update = useUpdateCampaign();
  const remove = useDeleteCampaign();
  const schedule = useScheduleCampaign();
  const unschedule = useUnscheduleCampaign();
  const sendTest = useSendTestCampaignMessage();

  const [name, setName] = useState(campaign?.name ?? "");
  const [segmentId, setSegmentId] = useState(campaign?.segmentId ?? "");
  const [variableMapping, setVariableMapping] = useState<
    CampaignVariableMapping[]
  >(campaign?.variableMapping ?? []);
  const [localDate, setLocalDate] = useState("");
  const [localTime, setLocalTime] = useState("10:00");

  if (!campaign) return null;

  const dirty =
    name.trim() !== campaign.name ||
    segmentId !== campaign.segmentId ||
    JSON.stringify(variableMapping) !==
      JSON.stringify(campaign.variableMapping);

  return (
    <>
      <SectionHeader
        title={campaign.name}
        onDelete={() =>
          remove.mutate(campaign.id, {
            onSuccess: () =>
              navigate({
                to: "/settings/campaigns",
                hash: (prevHash) => prevHash!,
              }),
          })
        }
        deleteLoading={remove.isPending}
      />
      <SectionBody className="gap-[20px]">
        <div className="px-[6px] flex flex-col gap-[16px]">
          <label>
            <div className="label">{t("Name")}</div>
            <input
              type="text"
              className="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div className="text-[13px] text-muted-foreground">
            {t("Sends through")} {campaign.organizationAddress} ·{" "}
            {campaign.templateName} ({campaign.templateLanguage})
          </div>

          <label>
            <div className="label">{t("Audience")}</div>
            <select
              className="text"
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
            >
              {(segments ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          {template && (
            <div className="flex flex-col gap-[6px]">
              <div className="label">{t("Variables")}</div>
              <CampaignVariableMapper
                components={template.components}
                mapping={variableMapping}
                onChange={setVariableMapping}
                contactFields={contactFields}
              />
            </div>
          )}

          {cost && (
            <div className="text-[13px] text-muted-foreground px-[2px]">
              {t("Audience")}: <strong>{cost.audience_count}</strong>{" "}
              {t("contacts")} · <strong>{cost.opted_in_count}</strong>{" "}
              {t("opted in and reachable")}
              {cost.estimated_total != null && (
                <>
                  {" · ~"}
                  {cost.currency} <strong>{cost.estimated_total}</strong>{" "}
                  {t("estimated")}
                </>
              )}
            </div>
          )}

          {(update.error ??
            remove.error ??
            schedule.error ??
            unschedule.error ??
            sendTest.error) && (
            <div className="text-destructive text-[13px]">
              {
                (
                  update.error ??
                  remove.error ??
                  schedule.error ??
                  unschedule.error ??
                  sendTest.error
                )?.message
              }
            </div>
          )}

          <div className="flex items-center gap-[8px]">
            <Button
              type="button"
              className="primary"
              disabled={!dirty || !name.trim()}
              loading={update.isPending}
              onClick={() =>
                update.mutate({
                  id: campaign.id,
                  name: name.trim(),
                  segmentId,
                  variableMapping,
                })
              }
            >
              {t("Save")}
            </Button>
            <Button
              type="button"
              loading={sendTest.isPending}
              onClick={() => sendTest.mutate(campaign.id)}
            >
              {t("Send test to my number")}
            </Button>
          </div>

          <div className="flex flex-col gap-[8px] mt-[12px]">
            <div className="label">{t("Schedule")}</div>
            {campaign.status === "scheduled" && campaign.scheduledAt ? (
              <div className="flex items-center gap-[8px]">
                <span className="text-[14px]">
                  {new Date(campaign.scheduledAt).toLocaleString()}
                </span>
                <Button
                  type="button"
                  loading={unschedule.isPending}
                  onClick={() => unschedule.mutate(campaign.id)}
                >
                  {t("Unschedule")}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-[8px] flex-wrap">
                <input
                  type="date"
                  className="text"
                  value={localDate}
                  onChange={(e) => setLocalDate(e.target.value)}
                />
                <input
                  type="time"
                  className="text"
                  value={localTime}
                  onChange={(e) => setLocalTime(e.target.value)}
                />
                <Button
                  type="button"
                  disabled={!localDate}
                  loading={schedule.isPending}
                  onClick={() =>
                    schedule.mutate({
                      id: campaign.id,
                      localDate,
                      localTime,
                    })
                  }
                >
                  {t("Schedule")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </SectionBody>
    </>
  );
}
