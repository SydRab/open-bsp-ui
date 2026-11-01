// [crm] P3-09: conversion feedback to Meta. The mapping catalog (which
// lead transition reports which Meta event) and the delivery log (every
// crm.outbox_events row, with manual retry) -- offer/enqueue/send all run
// automatically (crm.z_enqueue_status_conversion_event, crm._set_lead_
// stage's own hook, crm-conversion-sender), nothing here triggers a send
// directly except Retry on an already-failed row.
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import Button from "@/components/Button";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useDeleteEventMapping,
  useEventMappings,
  useLeadStages,
  useMyPermissions,
  useOutboxEvents,
  useReplayOutboxEvent,
  useSetEventMapping,
} from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/conversions/")({
  component: ConversionSettings,
});

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  qualified: "Qualified",
  unqualified: "Unqualified",
  converted: "Converted",
  dropped: "Dropped",
};

function ConversionSettings() {
  const { translate: t } = useTranslation();
  const { can } = useMyPermissions();
  const canManage = can("organization.manage");

  const { data: mappings } = useEventMappings();
  const { data: stages } = useLeadStages();
  const { data: outbox } = useOutboxEvents();
  const setMapping = useSetEventMapping();
  const deleteMapping = useDeleteEventMapping();
  const replay = useReplayOutboxEvent();

  const [triggerType, setTriggerType] = useState<"status" | "stage">("status");
  const [triggerValue, setTriggerValue] = useState("");
  const [metaEventName, setMetaEventName] = useState("");

  const stageName = (id: string) =>
    stages?.find((s) => s.id === id)?.name ?? t("a stage");

  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  return (
    <>
      <SectionHeader title={t("Conversions")} />

      <SectionBody className="gap-[24px]">
        <div className="flex flex-col gap-[8px]">
          <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
            {t("Event mapping")}
          </div>
          <div className="text-[13px] text-muted-foreground">
            {t(
              "Which event is reported to Meta when a lead reaches a status or stage -- ad-sourced leads only.",
            )}
          </div>

          {(mappings ?? []).map((mapping) => (
            <div
              key={mapping.id}
              className="flex items-center justify-between gap-[8px] py-[4px]"
            >
              <div className="text-[14px]">
                {mapping.trigger_type === "status"
                  ? (STATUS_LABELS[mapping.trigger_status ?? ""] ??
                    mapping.trigger_status)
                  : stageName(mapping.trigger_stage_id ?? "")}
                {" → "}
                <span className="font-medium">{mapping.meta_event_name}</span>
              </div>
              {canManage && (
                <button
                  type="button"
                  className="text-[13px] text-destructive"
                  onClick={() => deleteMapping.mutate(mapping.id)}
                >
                  {t("Remove")}
                </button>
              )}
            </div>
          ))}

          {canManage && (
            <form
              className="flex flex-wrap items-end gap-[8px] pt-[8px] border-t border-border"
              onSubmit={(e) => {
                e.preventDefault();
                if (!triggerValue || !metaEventName.trim()) return;
                setMapping.mutate(
                  { triggerType, triggerValue, metaEventName },
                  { onSuccess: () => setMetaEventName("") },
                );
              }}
            >
              <select
                className="text"
                value={triggerType}
                onChange={(e) => {
                  setTriggerType(e.target.value as "status" | "stage");
                  setTriggerValue("");
                }}
              >
                <option value="status">{t("Status")}</option>
                <option value="stage">{t("Stage")}</option>
              </select>
              <select
                className="text"
                value={triggerValue}
                onChange={(e) => setTriggerValue(e.target.value)}
              >
                <option value="">{t("Choose")}</option>
                {triggerType === "status"
                  ? Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {t(label)}
                      </option>
                    ))
                  : (stages ?? []).map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
              </select>
              <input
                className="text"
                placeholder={t("Event name (e.g. Lead, Purchase)")}
                value={metaEventName}
                onChange={(e) => setMetaEventName(e.target.value)}
              />
              {setMapping.error && (
                <div className="text-destructive text-[13px] w-full">
                  {setMapping.error.message}
                </div>
              )}
              <Button
                type="submit"
                className="primary"
                loading={setMapping.isPending}
              >
                {t("Save")}
              </Button>
            </form>
          )}
        </div>

        <div className="flex flex-col gap-[8px]">
          <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide">
            {t("Delivery log")}
          </div>

          {(outbox ?? []).length === 0 && (
            <div className="text-[13px] text-muted-foreground">
              {t("No events yet.")}
            </div>
          )}
          {(outbox ?? []).map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between gap-[8px] py-[4px] border-b border-border last:border-0"
            >
              <div className="min-w-0">
                <div className="text-[14px]">{event.event_name}</div>
                <div className="text-[12px] text-muted-foreground">
                  {formatTime(event.created_at)}
                  {" · "}
                  {event.processed_at
                    ? t("Sent")
                    : event.attempts >= 5
                      ? t("Exhausted")
                      : t("Pending")}
                  {event.processing_error && ` · ${event.processing_error}`}
                </div>
              </div>
              {canManage && !event.processed_at && (
                <button
                  type="button"
                  className="shrink-0 p-[4px] text-muted-foreground hover:text-primary"
                  title={t("Retry")}
                  onClick={() => replay.mutate(event.id)}
                >
                  <RefreshCw className="w-[14px] h-[14px]" />
                </button>
              )}
            </div>
          ))}
        </div>
      </SectionBody>
    </>
  );
}
