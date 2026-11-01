import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import SectionFooter from "@/components/SectionFooter";
import { useTranslation } from "@/hooks/useTranslation";
import { useCreateAgent, useCurrentAgent } from "@/queries/useAgents";
import { useForm, useWatch } from "react-hook-form";
import SectionBody from "@/components/SectionBody";
import { type AIAgentInsert, type AIAgentExtra } from "@/supabase/client";
import { useState } from "react";
import Button from "@/components/Button";
import SelectField from "@/components/SelectField";
import TextAreaField from "@/components/TextAreaField";
import SectionField from "@/components/SectionField";
import ToolsSection from "@/components/ToolsSection";

export const Route = createFileRoute("/_auth/agents/new")({
  component: AddAgent,
});

export const protocols: Record<
  string,
  NonNullable<AIAgentExtra["protocol"]>[]
> = {
  // Responses API support: OpenAI (native), Groq (stateless), and any
  // conforming custom endpoint. Google's OpenAI-compat layer 404s on /responses
  // and Anthropic uses its own Messages API — chat_completions only.
  openai: ["chat_completions", "responses"],
  google: ["chat_completions"],
  anthropic: ["chat_completions"],
  groq: ["chat_completions", "responses"],
  custom: ["chat_completions", "responses"],
};

export const protocolLabels: Record<
  NonNullable<AIAgentExtra["protocol"]>,
  string
> = {
  chat_completions: "Chat Completions",
  responses: "Responses",
};

export const defaultModels: Record<string, string> = {
  openai: "gpt-5-mini",
  anthropic: "claude-sonnet-4-6",
  google: "gemini-3-flash-preview",
  groq: "openai/gpt-oss-20b",
};

export const creditModels: Record<string, string[]> = {
  openai: [
    "gpt-5.4-nano",
    "gpt-5-mini",
    "gpt-5.4-mini",
    "gpt-5.3-chat-latest",
    "gpt-5.4",
    "gpt-5.5",
  ],
  anthropic: [
    "claude-haiku-4-5",
    "claude-sonnet-5",
    "claude-sonnet-4-6",
    "claude-opus-5",
  ],
  google: [
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3-flash-preview",
    "gemini-3.8-flash",
    "gemini-3.1-pro-preview",
  ],
  groq: ["openai/gpt-oss-20b", "openai/gpt-oss-120b"],
};

export const apiKeyInstructions: Record<
  string,
  { url: string; label: string; steps: string; free?: boolean }
> = {
  openai: {
    url: "https://platform.openai.com/api-keys",
    label: "platform.openai.com",
    steps: "API Keys > Create new secret key",
  },
  anthropic: {
    url: "https://console.anthropic.com/settings/keys",
    label: "console.anthropic.com",
    steps: "Settings > API Keys > Create Key",
  },
  google: {
    url: "https://aistudio.google.com/app/apikey",
    label: "aistudio.google.com",
    steps: "Get API key > Create API key",
    free: true,
  },
  groq: {
    url: "https://console.groq.com/keys",
    label: "console.groq.com",
    steps: "API Keys > Create API Key",
    free: true,
  },
};

function AddAgent() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const createAgent = useCreateAgent();
  const { data: currentAgent } = useCurrentAgent();
  const isAdmin = ["admin", "owner"].includes(currentAgent?.role || "");
  const [provider, setProvider] = useState<keyof typeof protocols>("groq");

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { isValid, isDirty },
  } = useForm<AIAgentInsert>({
    defaultValues: {
      extra: {
        mode: "active",
        api_url: "groq",
        protocol: "chat_completions",
        model: "openai/gpt-oss-20b",
        tools: [],
      },
    },
  });

  const model = useWatch({ control, name: "extra.model" });

  const onSubmit = (data: AIAgentInsert) => {
    createAgent.mutate(data, {
      onSuccess: (agent) =>
        navigate({
          to: `/agents/${agent.id}`,
          hash: (prevHash) => prevHash!,
        }),
    });
  };

  return (
    <>
      <SectionHeader title={t("Add agent")} />

      <SectionBody>
        <form id="create-agent-form" onSubmit={handleSubmit(onSubmit)}>
          <fieldset disabled={!isAdmin} className="contents">
            <p>
              {t(
                "Set up an AI agent that will automatically respond to your conversations.",
              )}
            </p>

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
                options={protocols[provider as keyof typeof protocols].map(
                  (p) => ({
                    value: p,
                    label: protocolLabels[p] || p,
                  }),
                )}
              />

              {provider === "custom" && (
                <label>
                  <div className="label">{t("API URL")}</div>
                  <input
                    type="url"
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
          </fieldset>
        </form>
      </SectionBody>

      <SectionFooter>
        <Button
          form="create-agent-form"
          type="submit"
          disabled={!isAdmin}
          invalid={!isValid || !isDirty}
          loading={createAgent.isPending}
          disabledReason={t("Requires administrator permissions")}
          className="primary"
        >
          {t("Create")}
        </Button>
      </SectionFooter>
    </>
  );
}
