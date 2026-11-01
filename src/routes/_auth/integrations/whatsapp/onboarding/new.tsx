import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import Button from "@/components/Button";
import SelectField from "@/components/SelectField";
import { useTranslation } from "@/hooks/useTranslation";
import { useCreateOnboardingToken } from "@/queries/useOnboardingTokens";
import { useCurrentAgent } from "@/queries/useAgents";
import { useForm } from "react-hook-form";

export const Route = createFileRoute(
  "/_auth/integrations/whatsapp/onboarding/new",
)({
  component: NewOnboardingToken,
});

type FormValues = {
  name: string;
  expires_in_days: string;
  callback_url: string;
  verify_token: string;
};

function NewOnboardingToken() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const createToken = useCreateOnboardingToken("whatsapp");
  const { data: currentAgent } = useCurrentAgent();
  const isAdmin = ["admin", "owner"].includes(currentAgent?.role || "");

  const { control, register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      name: "",
      expires_in_days: "7",
      callback_url: "",
      verify_token: "",
    },
  });

  return (
    <>
      <SectionHeader title={t("Generate link")} />

      <SectionBody>
        <form
          id="create-onboarding-token-form"
          onSubmit={handleSubmit((data) =>
            createToken.mutate(
              {
                name: data.name,
                expiresInDays: Number(data.expires_in_days),
                callbackUrl: data.callback_url,
                verifyToken: data.verify_token,
              },
              {
                onSuccess: (token) =>
                  navigate({
                    to: "/integrations/whatsapp/onboarding/$tokenId",
                    params: { tokenId: token.id },
                    hash: (prevHash) => prevHash!,
                  }),
              },
            ),
          )}
        >
          <fieldset disabled={!isAdmin} className="contents">
            <p className="text-muted-foreground text-[14px]">
              {t(
                "Generate a link for a third party to connect their WhatsApp number to your organization. They don't need an OpenBSP account or to be a member of your organization.",
              )}
            </p>

            <label>
              <div className="label">{t("Name")}</div>
              <input
                type="text"
                className="text"
                placeholder={t("Link name")}
                {...register("name", { required: true })}
              />
            </label>

            <SelectField
              name="expires_in_days"
              control={control}
              label={t("Expiration")}
              options={[
                { value: "1", label: t("1 day") },
                { value: "3", label: t("3 days") },
                { value: "7", label: t("7 days") },
                { value: "30", label: t("30 days") },
              ]}
              required
            />

            <label>
              <div className="label">{t("Webhook URL (optional)")}</div>
              <input
                type="url"
                className="text"
                placeholder="https://example.com/webhook"
                {...register("callback_url")}
              />
              <div className="text-muted-foreground text-[12px] mt-[4px]">
                {t(
                  "If you set this, this account's message webhooks are sent directly to your app instead of to OpenBSP.",
                )}
              </div>
            </label>

            <label>
              <div className="label">{t("Verification token")}</div>
              <input
                type="text"
                className="text"
                placeholder={t("Secret to validate the webhook")}
                {...register("verify_token")}
              />
            </label>
          </fieldset>
        </form>
      </SectionBody>

      <SectionFooter>
        <Button
          form="create-onboarding-token-form"
          type="submit"
          disabled={!isAdmin}
          loading={createToken.isPending}
          disabledReason={t("Requires administrator permissions")}
          className="primary"
        >
          {t("Generate")}
        </Button>
      </SectionFooter>
    </>
  );
}
