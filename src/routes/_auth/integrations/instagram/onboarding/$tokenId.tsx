import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import SectionBody from "@/components/SectionBody";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useDeleteOnboardingToken,
  useOnboardingTokens,
} from "@/queries/useOnboardingTokens";
import { useCurrentAgent } from "@/queries/useAgents";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export const Route = createFileRoute(
  "/_auth/integrations/instagram/onboarding/$tokenId",
)({
  component: OnboardingTokenDetail,
});

function OnboardingTokenDetail() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { tokenId } = Route.useParams();
  const { data: tokens } = useOnboardingTokens("instagram");
  const { data: currentAgent } = useCurrentAgent();
  const deleteToken = useDeleteOnboardingToken("instagram");
  const isAdmin = ["admin", "owner"].includes(currentAgent?.role || "");
  const [copied, setCopied] = useState(false);

  const token = tokens?.find((tk) => tk.id === tokenId);
  const isActive =
    token &&
    token.status === "active" &&
    new Date(token.expires_at) > new Date();
  const onboardUrl = `${window.location.origin}/onboard/instagram/${tokenId}`;

  function getStatusLabel() {
    if (!token) return "";
    if (token.status === "used") return t("Used");
    if (token.status === "expired" || new Date(token.expires_at) < new Date()) {
      return t("Expired");
    }
    return t("Active");
  }

  function copyLink() {
    navigator.clipboard
      .writeText(onboardUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(console.error);
  }

  return (
    token && (
      <>
        <SectionHeader
          title={token.name}
          onDelete={() =>
            deleteToken.mutate(tokenId, {
              onSuccess: () =>
                navigate({ to: "..", hash: (prevHash) => prevHash! }),
            })
          }
          deleteDisabled={!isAdmin}
          deleteDisabledReason={t("Requires administrator permissions")}
          deleteLoading={deleteToken.isPending}
        />

        <SectionBody>
          <form>
            <label>
              <div className="label">{t("Status")}</div>
              <div className="text-[16px] text-foreground">
                {getStatusLabel()}
              </div>
            </label>

            <label>
              <div className="label">{t("Expires")}</div>
              <div className="text-[16px] text-foreground">
                {new Date(token.expires_at).toLocaleString()}
              </div>
            </label>

            {token.used_at && (
              <label>
                <div className="label">{t("Used")}</div>
                <div className="text-[16px] text-foreground">
                  {new Date(token.used_at).toLocaleString()}
                </div>
              </label>
            )}

            <label>
              <div className="label">{t("Link")}</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="text"
                  readOnly
                  value={onboardUrl}
                />
                {isActive && (
                  <button
                    type="button"
                    className="p-[8px] hover:bg-muted rounded-full shrink-0"
                    title={t("Copy link")}
                    onClick={copyLink}
                  >
                    {copied ? (
                      <Check className="w-[20px] h-[20px] text-primary" />
                    ) : (
                      <Copy className="w-[20px] h-[20px] text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
            </label>
          </form>
        </SectionBody>
      </>
    )
  );
}
