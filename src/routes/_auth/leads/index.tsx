// [crm] P3-07a: the pipeline kanban board -- columns are crm.lead_stages
// (admin-editable, sort_order), cards are crm.leads. Drag only ever moves
// stage_id (crm.set_lead_stage) -- status (dropped/converted) stays a
// separate, explicit action elsewhere, since stage and status are
// deliberately independent (P3-02). Renders in the narrow resizable panel
// like every other list route (no _auth.tsx shell change); columns scroll
// horizontally within it -- widen the panel for more room.
import { useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { createFileRoute } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import Avatar from "@/components/Avatar";
import { LinkButton } from "@/components/LinkButton";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type LeadStage,
  type PipelineLead,
  useLeadQualities,
  useLeadStages,
  usePipelineLeads,
  useSetLeadDealValue,
  useSetLeadStage,
} from "@/queries/useCrm";
import { AlarmClockCheck } from "lucide-react";

export const Route = createFileRoute("/_auth/leads/")({
  component: PipelineBoard,
});

const UNSTAGED = "unstaged";

function DealValue({ lead }: { lead: PipelineLead }) {
  const { mutate } = useSetLeadDealValue();
  const [draft, setDraft] = useState<string | null>(null);

  const value =
    draft ?? (lead.deal_value != null ? String(lead.deal_value) : "");

  return (
    <input
      type="number"
      min={0}
      inputMode="decimal"
      className="w-full bg-transparent text-[13px] text-muted-foreground outline-none border-b border-transparent hover:border-border focus:border-primary"
      placeholder="0"
      value={value}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft === null) return;
        const parsed = draft.trim() === "" ? null : Number(draft);
        if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
          setDraft(null);
          return;
        }
        if (parsed !== lead.deal_value) {
          mutate({ leadId: lead.id, value: parsed });
        }
        setDraft(null);
      }}
    />
  );
}

function LeadCard({
  lead,
  qualityName,
}: {
  lead: PipelineLead;
  qualityName: string | null;
}) {
  const { translate: t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: lead.id });
  const contactName = lead.contactName || t("Sin nombre");

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
      }}
      className={
        "rounded-xl border border-border bg-background p-[10px] mb-[8px] cursor-grab active:cursor-grabbing " +
        (isDragging ? "opacity-40" : "")
      }
    >
      <div className="flex items-center gap-[8px]">
        <Avatar
          fallback={contactName.charAt(0).toUpperCase()}
          size={28}
          className="bg-muted text-muted-foreground text-[12px]"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] text-foreground">
            {contactName}
          </div>
          {lead.assigneeName && (
            <div className="truncate text-[12px] text-muted-foreground">
              {lead.assigneeName}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-[8px] gap-[8px]">
        <DealValue lead={lead} />
        {qualityName && (
          <span className="shrink-0 rounded-full bg-muted px-[8px] py-[2px] text-[11px] text-muted-foreground">
            {qualityName}
          </span>
        )}
      </div>
    </div>
  );
}

function Column({
  stage,
  leads,
  qualityName,
}: {
  stage: LeadStage | null;
  leads: PipelineLead[];
  qualityName: (id: string | null) => string | null;
}) {
  const { translate: t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: stage?.id ?? UNSTAGED });

  return (
    <div
      ref={setNodeRef}
      className={
        "w-[240px] shrink-0 flex flex-col rounded-xl mr-[10px] " +
        (isOver ? "bg-primary/5" : "bg-muted/40")
      }
    >
      <div className="px-[10px] py-[8px] text-[13px] font-medium text-foreground flex items-center justify-between">
        <span className="truncate">{stage ? stage.name : t("Sin etapa")}</span>
        <span className="text-muted-foreground text-[12px]">
          {leads.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-[8px] pb-[8px] min-h-[60px]">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            qualityName={qualityName(lead.quality_id)}
          />
        ))}
      </div>
    </div>
  );
}

function PipelineBoard() {
  const { translate: t } = useTranslation();
  const { data: stages } = useLeadStages();
  const { data: qualities } = useLeadQualities();
  const { data: leads } = usePipelineLeads();
  const { mutate: setStage } = useSetLeadStage();

  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const qualityName = (id: string | null) =>
    (id && qualities?.find((q) => q.id === id)?.name) || null;

  const assignees = useMemo(() => {
    const seen = new Map<string, string>();
    for (const lead of leads ?? []) {
      if (lead.assigned_to && lead.assigneeName) {
        seen.set(lead.assigned_to, lead.assigneeName);
      }
    }
    return [...seen.entries()];
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return (leads ?? []).filter(
      (lead) =>
        (!assigneeFilter || lead.assigned_to === assigneeFilter) &&
        (!qualityFilter || lead.quality_id === qualityFilter),
    );
  }, [leads, assigneeFilter, qualityFilter]);

  function leadsFor(stageId: string | null) {
    return filteredLeads.filter((lead) => (lead.stage_id ?? null) === stageId);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const stageId = over.id === UNSTAGED ? null : String(over.id);
    const lead = (leads ?? []).find((l) => l.id === active.id);
    if (!lead || (lead.stage_id ?? null) === stageId) return;
    setStage({ leadId: lead.id, stageId });
  }

  return (
    <>
      <SectionHeader title={t("Pipeline")} />

      <div className="flex items-center gap-[8px] px-[10px] py-[8px] border-b border-border">
        <select
          className="text-[13px] bg-background border border-border rounded-lg px-[8px] py-[4px]"
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
        >
          <option value="">{t("Todos los asignados")}</option>
          {assignees.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          className="text-[13px] bg-background border border-border rounded-lg px-[8px] py-[4px]"
          value={qualityFilter}
          onChange={(e) => setQualityFilter(e.target.value)}
        >
          <option value="">{t("Toda calidad")}</option>
          {(qualities ?? []).map((q) => (
            <option key={q.id} value={q.id}>
              {q.name}
            </option>
          ))}
        </select>
        <LinkButton
          to="/leads/unanswered"
          title={t("Leads sin respuesta")}
          className="ml-auto flex items-center gap-[4px] text-[13px] text-muted-foreground px-[8px] py-[4px] rounded-lg hover:bg-muted"
        >
          <AlarmClockCheck className="w-[16px] h-[16px]" />
          {t("Leads sin respuesta")}
        </LinkButton>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-[10px]">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex h-full">
            <Column
              stage={null}
              leads={leadsFor(null)}
              qualityName={qualityName}
            />
            {(stages ?? []).map((stage) => (
              <Column
                key={stage.id}
                stage={stage}
                leads={leadsFor(stage.id)}
                qualityName={qualityName}
              />
            ))}
          </div>
        </DndContext>
      </div>
    </>
  );
}
