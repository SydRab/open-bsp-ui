import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import SectionFooter from "@/components/SectionFooter";
import { useTranslation } from "@/hooks/useTranslation";
import { useCreateWebhook, type WebhookInsert } from "@/queries/useWebhooks";
import { useCurrentAgent } from "@/queries/useAgents";
import { useForm } from "react-hook-form";
import SectionBody from "@/components/SectionBody";
import Button from "@/components/Button";
import SelectField from "@/components/SelectField";

export const Route = createFileRoute("/_auth/settings/webhooks/new")({
  component: AddWebhook,
});

function AddWebhook() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const createWebhook = useCreateWebhook();
  const { data: currentAgent } = useCurrentAgent();
  const isOwner = currentAgent?.role === "owner";

  const {
    register,
    handleSubmit,
    control,
    formState: { isValid, isDirty },
  } = useForm<WebhookInsert>({
    defaultValues: {
      operations: ["insert", "update"],
      table_name: "messages",
    },
  });

  return (
    <>
      <SectionHeader title={t("Add webhook")} />

      <SectionBody>
        <form
          id="create-webhook-form"
          onSubmit={handleSubmit((data) =>
            createWebhook.mutate(data, {
              onSuccess: (webhook) =>
                navigate({
                  to: `/settings/webhooks/${webhook!.id}`,
                  hash: (prevHash) => prevHash!,
                }),
            }),
          )}
        >
          <fieldset disabled={!isOwner} className="contents">
            <p>
              {t(
                "Webhooks notify your server when events occur. Select the table and operations you want to monitor.",
              )}
            </p>

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
          </fieldset>
        </form>
      </SectionBody>

      <SectionFooter>
        <Button
          form="create-webhook-form"
          type="submit"
          disabled={!isOwner}
          invalid={!isValid || !isDirty}
          loading={createWebhook.isPending}
          disabledReason={t("Requires owner permissions")}
          className="primary"
        >
          {t("Create")}
        </Button>
      </SectionFooter>
    </>
  );
}
