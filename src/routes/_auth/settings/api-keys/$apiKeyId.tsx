import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { useApiKey, useDeleteApiKey } from "@/queries/useApiKeys";
import { useCurrentAgent } from "@/queries/useAgents";
import { useForm } from "react-hook-form";
import SectionBody from "@/components/SectionBody";
import type { ApiKeyUpdate } from "@/supabase/client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export const Route = createFileRoute("/_auth/settings/api-keys/$apiKeyId")({
  component: ApiKeyDetail,
});

function ApiKeyDetail() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { apiKeyId } = Route.useParams();
  const { data: apiKey } = useApiKey(apiKeyId);
  const { data: currentAgent } = useCurrentAgent();
  const isOwner = currentAgent?.role === "owner";
  const deleteApiKey = useDeleteApiKey();

  const { register } = useForm<ApiKeyUpdate>({
    values: apiKey,
  });
  const [copied, setCopied] = useState(false);

  function copyKey() {
    if (apiKey?.key) {
      navigator.clipboard
        .writeText(apiKey.key)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(console.error);
    }
  }

  return (
    apiKey && (
      <>
        <SectionHeader
          title={t("API Key")}
          onDelete={() =>
            deleteApiKey.mutate(apiKeyId, {
              onSuccess: () =>
                navigate({ to: "..", hash: (prevHash) => prevHash! }),
            })
          }
          deleteDisabled={!isOwner}
          deleteDisabledReason={t("Requires owner permissions")}
          deleteLoading={deleteApiKey.isPending}
        />

        <SectionBody>
          <form>
            <div className="instructions">
              <p>
                {t("Configure the following HTTP headers for authentication:")}
              </p>
              <ul>
                <li>
                  <code className="font-mono">authorization:</code>{" "}
                  <code className="font-mono break-all">
                    {import.meta.env.VITE_SUPABASE_ANON_KEY}
                  </code>
                </li>
                <li>
                  <code className="font-mono">api-key:</code>{" "}
                  {t("the value of the generated key below")}
                </li>
              </ul>
            </div>

            <label>
              <div className="label">{t("Name")}</div>
              <input
                type="text"
                className="text"
                readOnly
                {...register("name")}
              />
            </label>

            <label>
              <div className="label">{t("Role")}</div>
              <div className="text-[16px] text-foreground">
                {apiKey.role === "owner" && t("Owner")}
                {apiKey.role === "admin" && t("Administrator")}
                {apiKey.role === "member" && t("Member")}
              </div>
            </label>

            <label>
              <div className="label">{t("Key")}</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="text"
                  readOnly
                  {...register("key")}
                />
                <button
                  type="button"
                  className="p-[8px] hover:bg-muted rounded-full shrink-0"
                  title={t("Copy key")}
                  onClick={copyKey}
                >
                  {copied ? (
                    <Check className="w-[20px] h-[20px] text-primary" />
                  ) : (
                    <Copy className="w-[20px] h-[20px] text-muted-foreground" />
                  )}
                </button>
              </div>
            </label>
          </form>
        </SectionBody>
      </>
    )
  );
}
