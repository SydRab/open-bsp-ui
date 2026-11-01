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
  "/_auth/integrations/instagram/onboarding/new",
)({
  component: NewOnboardingToken,
});

type FormValues = {
  name: string;
  expires_in_days: string;
};

function NewOnboardingToken() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const createToken = useCreateOnboardingToken("instagram");
  const { data: currentAgent } = useCurrentAgent();
  const isAdmin = ["admin", "owner"].includes(currentAgent?.role || "");

  const { control, register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      name: "",
      expires_in_days: "7",
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
              },
              {
                onSuccess: (token) =>
                  navigate({
                    to: "/integrations/instagram/onboarding/$tokenId",
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
                "Generate a link so a third party can connect their Instagram account to your organization. They don't need an Open BSP account or to be a member of your organization.",
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
