import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  type WebhookUpdate,
} from "@/queries/useWebhooks";
import { useForm } from "react-hook-form";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import { useCurrentAgent } from "@/queries/useAgents";
import Button from "@/components/Button";
import SelectField from "@/components/SelectField";

export const Route = createFileRoute("/_auth/settings/webhooks/$webhookId")({
  component: EditWebhook,
});

function EditWebhook() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { webhookId } = Route.useParams();
  const { data: webhook } = useWebhook(webhookId);
  const { data: currentAgent } = useCurrentAgent();
  const isOwner = currentAgent?.role === "owner";
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();

  const {
    register,
    handleSubmit,
    control,
    formState: { isValid, isDirty },
  } = useForm<WebhookUpdate>({
    values: webhook,
  });

  return (
    webhook && (
      <>
        <SectionHeader
          title={t("Edit webhook")}
          onDelete={() =>
            deleteWebhook.mutate(webhookId, {
              onSuccess: () =>
                navigate({ to: "..", hash: (prevHash) => prevHash! }),
            })
          }
          deleteDisabled={!isOwner}
          deleteDisabledReason={t("Requires owner permissions")}
          deleteLoading={deleteWebhook.isPending}
        />

        <SectionBody>
          <form
            id="webhook-form"
            onSubmit={handleSubmit((data) =>
              updateWebhook.mutate({
                id: webhookId,
                ...data,
              }),
            )}
          >
            <label>
              <div className="label">{t("URL")}</div>
              <input
                type="url"
                className="text"
                placeholder={t("https://example.com/webhook")}
                {...register("url", { required: true })}
              />
            </label>

            <SelectField
              name="table_name"
              control={control}
              label={t("Table")}
              options={[
                { value: "messages", label: t("Messages") },
                { value: "conversations", label: t("Conversations") },
                { value: "organizations_addresses", label: t("Accounts") },
                { value: "contacts", label: t("Contacts") },
                {
                  value: "contacts_addresses",
                  label: t("Contact addresses"),
                },
                { value: "logs", label: t("Logs") },
              ]}
              required
            />

            <SelectField
              name="operations"
              control={control}
              label={t("Operations")}
              multiple
              options={[
                { value: "insert", label: t("Insert") },
                { value: "update", label: t("Update") },
              ]}
            />

            <label>
              <div className="label">{t("Token (optional)")}</div>
              <input
                className="text"
                type="text"
                placeholder={t("Authentication token")}
                {...register("token")}
              />
            </label>
          </form>
        </SectionBody>

        <SectionFooter>
          <Button
            form="webhook-form"
            type="submit"
            disabled={!isOwner}
            invalid={!isValid || !isDirty}
            loading={updateWebhook.isPending}
            disabledReason={t("Requires owner permissions")}
            className="primary"
          >
            {t("Update")}
          </Button>
        </SectionFooter>
      </>
    )
  );
}
