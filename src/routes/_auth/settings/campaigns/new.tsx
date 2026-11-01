// [crm] P4-04: new campaign. Pick the connected number, an APPROVED
// template on that number, the audience segment, map its variables, name
// it, save as a draft.
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import SectionHeader from "@/components/SectionHeader";
import Button from "@/components/Button";
import CampaignVariableMapper from "@/components/CampaignVariableMapper";
import { useTranslation } from "@/hooks/useTranslation";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import { useTemplates } from "@/queries/useTemplates";
import {
  type CampaignVariableMapping,
  useCreateCampaign,
  useCustomFields,
  useSegments,
} from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/campaigns/new")({
  component: NewCampaign,
});

function NewCampaign() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateCampaign();

  const { data: addresses } = useOrganizationsAddresses();
  const whatsappAddresses = (addresses ?? []).filter(
    (a) => a.service === "whatsapp" && a.status === "connected",
  );

  const [name, setName] = useState("");
  const [organizationAddress, setOrganizationAddress] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [variableMapping, setVariableMapping] = useState<
    CampaignVariableMapping[]
  >([]);

  const { data: templates } = useTemplates(organizationAddress || undefined);
  const approvedTemplates = (templates ?? []).filter(
    (tpl) => tpl.status === "APPROVED",
  );
  const template = approvedTemplates.find(
    (tpl) => `${tpl.name}::${tpl.language}` === templateKey,
  );

  const { data: segments } = useSegments();
  const { data: fields } = useCustomFields();
  const contactFields = (fields ?? []).filter(
    (f) => f.definition.entity === "contact" && !f.definition.archived,
  );

  const canCreate = name.trim() && organizationAddress && template && segmentId;

  return (
    <>
      <SectionHeader title={t("New campaign")} />
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

          <label>
            <div className="label">{t("Send through")}</div>
            <select
              className="text"
              value={organizationAddress}
              onChange={(e) => {
                setOrganizationAddress(e.target.value);
                setTemplateKey("");
              }}
            >
              <option value="" disabled>
                {t("Select a number")}
              </option>
              {whatsappAddresses.map((a) => (
                <option key={a.address} value={a.address}>
                  {a.address}
                </option>
              ))}
            </select>
          </label>

          {organizationAddress && (
            <label>
              <div className="label">{t("Template")}</div>
              <select
                className="text"
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
              >
                <option value="" disabled>
                  {t("Select a template")}
                </option>
                {approvedTemplates.length === 0 && (
                  <option value="" disabled>
                    {t("No approved templates on this number")}
                  </option>
                )}
                {approvedTemplates.map((tpl) => (
                  <option
                    key={`${tpl.name}::${tpl.language}`}
                    value={`${tpl.name}::${tpl.language}`}
                  >
                    {tpl.name} ({tpl.language})
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            <div className="label">{t("Audience")}</div>
            <select
              className="text"
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
            >
              <option value="" disabled>
                {t("Select a segment")}
              </option>
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

          {create.error && (
            <div className="text-destructive text-[13px]">
              {create.error.message}
            </div>
          )}
        </div>
      </SectionBody>

      <SectionFooter>
        <Button
          type="button"
          className="primary"
          disabled={!canCreate}
          loading={create.isPending}
          onClick={() =>
            template &&
            create.mutate(
              {
                name: name.trim(),
                organizationAddress,
                templateName: template.name,
                templateLanguage: template.language,
                segmentId,
                variableMapping,
              },
              {
                onSuccess: (id) =>
                  navigate({
                    to: "/settings/campaigns/$campaignId",
                    params: { campaignId: id },
                    hash: (prevHash) => prevHash!,
                  }),
              },
            )
          }
        >
          {t("Create campaign")}
        </Button>
      </SectionFooter>
    </>
  );
}
