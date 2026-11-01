import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import SectionHeader from "@/components/SectionHeader";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useAgent,
  useDeleteAgent,
  useUpdateAgent,
  useCurrentAgent,
} from "@/queries/useAgents";
import { useForm, useWatch } from "react-hook-form";
import SectionBody from "@/components/SectionBody";
import useBoundStore from "@/stores/useBoundStore";
import { type AIAgentRow, type AIAgentUpdate } from "@/supabase/client";
import { openLocalDirect } from "@/utils/ConversationUtils";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import SectionFooter from "@/components/SectionFooter";
import {
  protocols,
  protocolLabels,
  defaultModels,
  creditModels,
  apiKeyInstructions,
} from "./new";
import Button from "@/components/Button";
import SelectField from "@/components/SelectField";
import TextAreaField from "@/components/TextAreaField";
import SectionField from "@/components/SectionField";
import ToolsSection from "@/components/ToolsSection";

export const Route = createFileRoute("/_auth/agents/$agentId")({
  component: AgentDetail,
});

function AgentDetail() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { agentId } = Route.useParams();
  const { data: agent } = useAgent<AIAgentRow>(agentId);
  const { data: currentAgent } = useCurrentAgent();
  const isAdmin = ["admin", "owner"].includes(currentAgent?.role || "");
  const deleteAgent = useDeleteAgent();
  const updateAgent = useUpdateAgent();
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);
  const [provider, setProvider] = useState<keyof typeof protocols>("openai");

  const localAddress = useOrganizationsAddresses().data?.find(
    (address) => address.service === "local",
  );

  useEffect(() => {
    if (!agent) return;
    const apiUrl = agent.extra?.api_url || "";
    const isKnown = ["openai", "anthropic", "groq", "google"].includes(apiUrl);
    setProvider(isKnown ? apiUrl : "custom");
  }, [agent]);

  // Normalize agent data to ensure tools is always an array
  const normalizedAgent = useMemo(() => {
    if (!agent) return undefined;
    return {
      ...agent,
      extra: {
        ...agent.extra,
        tools: agent.extra?.tools ?? [],
      },
    };
  }, [agent]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { isDirty, isValid },
  } = useForm<AIAgentUpdate>({ values: normalizedAgent });

  const model = useWatch({ control, name: "extra.model" });

  const handleChat = async () => {
    if (!activeOrgId || !localAddress || !currentAgent) return;

    // A local DM with the AI agent: a direct is DEFINED by its roster, so the
    // address IS the participant list — no per-conversation agent override
    // exists any more. Which also means there is only ever ONE of these, so
    // this opens the room rather than starting a new one.
    const convId = await openLocalDirect({
      organization_id: activeOrgId,
      organization_address: localAddress.address,
      roster: [currentAgent.id, agentId],
      name: agent?.name,
    });

    void navigate({ hash: convId });
  };

  return (
    agent && (
      <>
        <SectionHeader
          title={agent.name}
          onDelete={() => {
            deleteAgent.mutate(agentId, {
              onSuccess: () =>
                navigate({ to: "..", hash: (prevHash) => prevHash! }),
            });
          }}
          deleteDisabled={!isAdmin}
          deleteDisabledReason={t("Requires administrator permissions")}
          deleteLoading={deleteAgent.isPending}
        />

        <SectionBody>
          <form
            id="agent-form"
            onSubmit={handleSubmit((data) => updateAgent.mutate(data))}
          >
            {/* Root view fields */}
            <label>
              <div className="label">{t("Name")}</div>
              <input
                type="text"
                className="text"
                placeholder={t("Agent name")}
                {...register("name", { required: true })}
              />
            </label>

            <SelectField
              name="extra.mode"
              control={control}
              label={t("Status")}
              options={[
                { value: "active", label: t("Active") },
                { value: "inactive", label: t("Inactive") },
              ]}
            />

            <div className="border-t border-border" />

            <TextAreaField
              name="extra.instructions"
              control={control}
              label={t("Instructions")}
              placeholder={t("You are a helpful assistant...")}
            />

            {/* Tools Section */}
            <ToolsSection
              control={control}
              register={register}
              setValue={setValue}
            />

            {/* AI Section */}
            <SectionField
              label={t("AI model")}
              description={model || t("None")}
            >
              <SelectField
                value={provider}
                modalClassName="bottom-0"
                onChange={(val) => {
                  setProvider(val);
                  setValue("extra.model", defaultModels[val] || "");

                  const availableProtocols =
                    protocols[val as keyof typeof protocols];
                  setValue("extra.protocol", availableProtocols[0]);

                  if (val !== "custom") {
                    setValue("extra.api_url", val, { shouldDirty: true });
                  } else {
                    setValue("extra.api_url", "", { shouldDirty: true });
                  }
                }}
                label={t("Provider")}
                options={[
                  { value: "openai", label: "OpenAI" },
                  { value: "anthropic", label: "Anthropic" },
                  { value: "groq", label: "Groq" },
                  { value: "google", label: "Google" },
                  { value: "custom", label: t("Custom") },
                ]}
              />

              <SelectField
                name="extra.protocol"
                control={control}
                modalClassName="bottom-0"
                label={t("Protocol")}
                options={(
                  protocols[provider as keyof typeof protocols] || []
                ).map((p) => ({
                  value: p,
                  label: protocolLabels[p] || p,
                }))}
              />

              {provider === "custom" && (
                <label>
                  <div className="label">{t("API URL")}</div>
                  <input
                    type="text"
                    className="text"
                    placeholder="https://api.example.com/v1"
                    {...register("extra.api_url")}
                  />
                </label>
              )}

              <label>
                <div className="label">{t("API Key")}</div>
                <input
                  type="text"
                  className="text"
                  placeholder={t("Provider API Key")}
                  {...register("extra.api_key")}
                />
              </label>

              {provider !== "custom" && apiKeyInstructions[provider] && (
                <div className="instructions">
                  <p>
                    {t(
                      "Using your own API key does not consume local credits and allows you to use any model.",
                    )}
                  </p>
                  <p>
                    <strong>
                      {apiKeyInstructions[provider].free
                        ? t("Get a free key:")
                        : t("Get a key:")}
                    </strong>{" "}
                    <a
                      href={apiKeyInstructions[provider].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {apiKeyInstructions[provider].label}
                    </a>
                    {" > "}
                    {apiKeyInstructions[provider].steps}
                  </p>
                </div>
              )}

              <label>
                <div className="label">{t("Model")}</div>
                <input
                  type="text"
                  className="text"
                  placeholder={t("Model name")}
                  {...register("extra.model")}
                />
              </label>

              {provider !== "custom" && creditModels[provider] && (
                <div className="instructions">
                  <p>{t("The following models work with AI credits:")}</p>
                  <ul>
                    {creditModels[provider].map((m) => (
                      <li key={m}>
                        <code>{m}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <label>
                <div className="label">{t("Response delay (seconds)")}</div>
                <input
                  type="number"
                  className="text"
                  min={0}
                  placeholder="3"
                  {...register("extra.response_delay_seconds", {
                    valueAsNumber: true,
                  })}
                />
              </label>

              <TextAreaField
                control={control}
                name="extra.welcome_message"
                label={t("Welcome message")}
                placeholder={t(
                  "Hello! I'm a virtual agent. How can I help you?",
                )}
              />

              <label>
                <div className="label">{t("Maximum messages")}</div>
                <input
                  type="number"
                  className="text"
                  min={1}
                  placeholder="50"
                  {...register("extra.max_messages", { valueAsNumber: true })}
                />
              </label>

              <label>
                <div className="label">{t("Temperature")}</div>
                <input
                  type="number"
                  className="text"
                  min={0}
                  max={2}
                  step={0.1}
                  placeholder="1.0"
                  {...register("extra.temperature", { valueAsNumber: true })}
                />
              </label>

              {provider === "custom" && (
                <div className="instructions">
                  <p>
                    {t(
                      "The following HTTP headers are sent with each request:",
                    )}
                  </p>
                  <ul>
                    <li>
                      <code>organization-id</code>
                    </li>
                    <li>
                      <code>organization-address</code>
                    </li>
                    <li>
                      <code>conversation-id</code>
                    </li>
                    <li>
                      <code>agent-id</code>
                    </li>
                    <li>
                      <code>contact-id</code>
                    </li>
                    <li>
                      <code>contact-address</code>
                    </li>
                  </ul>
                </div>
              )}
            </SectionField>
          </form>
        </SectionBody>

        <SectionFooter>
          {!isDirty ? (
            <button
              type="button"
              className="primary"
              onClick={() => void handleChat()}
            >
              {t("Chat with this agent")}
            </button>
          ) : (
            <Button
              form="agent-form"
              type="submit"
              disabled={!isAdmin}
              invalid={!isValid}
              loading={updateAgent.isPending}
              disabledReason={t("Requires administrator permissions")}
              className="primary"
            >
              {t("Update")}
            </Button>
          )}
        </SectionFooter>
      </>
    )
  );
}
