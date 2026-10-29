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
import Button from "@/components/Button";
import { LinkButton } from "@/components/LinkButton";
import LeadHistoryModal from "@/components/LeadHistoryModal";
import LeadRequiredFieldsModal from "@/components/LeadRequiredFieldsModal";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type LeadStage,
  type PipelineLead,
  useBulkSetLeadStage,
  useCustomFields,
  useLeadQualities,
  useLeadStages,
  usePipelineLeads,
  useSetLeadDealValue,
  useSetLeadStage,
  useStageRequiredFields,
} from "@/queries/useCrm";
import { AlarmClockCheck, History } from "lucide-react";

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
  selected,
  onToggleSelect,
  onShowHistory,
}: {
  lead: PipelineLead;
  qualityName: string | null;
  selected: boolean;
  onToggleSelect: () => void;
  onShowHistory: () => void;
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
        (isDragging ? "opacity-40" : "") +
        (selected ? " ring-2 ring-primary" : "")
      }
    >
      <div className="flex items-center gap-[8px]">
        <input
          type="checkbox"
          className="shrink-0"
          checked={selected}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={onToggleSelect}
        />
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
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onShowHistory();
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <History className="w-[14px] h-[14px]" />
        </button>
      </div>
    </div>
  );
}

function Column({
  stage,
  leads,
  qualityName,
  selected,
  onToggleSelect,
  onShowHistory,
}: {
  stage: LeadStage | null;
  leads: PipelineLead[];
  qualityName: (id: string | null) => string | null;
  selected: Set<string>;
  onToggleSelect: (leadId: string) => void;
  onShowHistory: (leadId: string) => void;
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
            selected={selected.has(lead.id)}
            onToggleSelect={() => onToggleSelect(lead.id)}
            onShowHistory={() => onShowHistory(lead.id)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Deal-entity field ids required for stageId that `lead` has no value for
 * yet -- lead_stage_required_fields stores field ids, but crm.leads.
 * custom_fields is keyed by the field's own item_key, so fieldKeyById
 * (built from useCustomFields()) bridges the two.
 */
function missingRequiredFields(
  lead: PipelineLead,
  stageId: string | null,
  requiredByStage: Map<string, string[]> | undefined,
  fieldKeyById: Map<string, string>,
): string[] {
  if (!stageId || !requiredByStage) return [];
  const required = requiredByStage.get(stageId) ?? [];
  const values = (lead.custom_fields ?? {}) as Record<string, unknown>;
  return required.filter((fieldId) => {
    const key = fieldKeyById.get(fieldId);
    return !key || values[key] === undefined;
  });
}

function PipelineBoard() {
  const { translate: t } = useTranslation();
  const { data: stages } = useLeadStages();
  const { data: qualities } = useLeadQualities();
  const { data: leads } = usePipelineLeads();
  const { data: fields } = useCustomFields();
  const { data: requiredByStage } = useStageRequiredFields();
  const { mutate: setStage } = useSetLeadStage();
  const bulkSetStage = useBulkSetLeadStage();

  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStageId, setBulkStageId] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    leadId: string;
    stageId: string | null;
    missingFieldIds: string[];
  } | null>(null);
  const [historyLeadId, setHistoryLeadId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const qualityName = (id: string | null) =>
    (id && qualities?.find((q) => q.id === id)?.name) || null;

  const fieldKeyById = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of fields ?? []) map.set(f.id, f.key);
    return map;
  }, [fields]);

  const assignees = useMemo(() => {
    const seen = new Map<string, string>();
    for (const lead of leads ?? []) {
      if (lead.assigned_to && lead.assigneeName) {
        seen.set(lead.assigned_to, lead.assigneeName);
      }
    }
    return [...seen.entries()];
  }, [leads]);

  // [crm] P3-07c: id -> name lookups for the history modal's describeAction.
  const stageNames = useMemo(
    () => new Map((stages ?? []).map((s) => [s.id, s.name])),
    [stages],
  );
  const qualityNames = useMemo(
    () => new Map((qualities ?? []).map((q) => [q.id, q.name])),
    [qualities],
  );
  const agentNames = useMemo(() => new Map(assignees), [assignees]);

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

  function toggleSelect(leadId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const stageId = over.id === UNSTAGED ? null : String(over.id);
    const lead = (leads ?? []).find((l) => l.id === active.id);
    if (!lead || (lead.stage_id ?? null) === stageId) return;

    const missingFieldIds = missingRequiredFields(
      lead,
      stageId,
      requiredByStage,
      fieldKeyById,
    );
    if (missingFieldIds.length > 0) {
      setPendingMove({ leadId: lead.id, stageId, missingFieldIds });
      return;
    }
    setStage({ leadId: lead.id, stageId });
  }

  function handleBulkMove() {
    setBulkError(null);
    const stageId = bulkStageId === "" ? null : bulkStageId;
    const leadIds = [...selected];
    const blocked = leadIds.some((id) => {
      const lead = (leads ?? []).find((l) => l.id === id);
      return (
        lead &&
        missingRequiredFields(lead, stageId, requiredByStage, fieldKeyById)
          .length > 0
      );
    });
    if (blocked) {
      setBulkError(
        t(
          "Uno o más leads seleccionados les falta un campo obligatorio para esa etapa -- muévelos uno por uno para completarlos.",
        ),
      );
      return;
    }
    bulkSetStage.mutate(
      { leadIds, stageId },
      { onSuccess: () => setSelected(new Set()) },
    );
  }

  const pendingLead = pendingMove
    ? (leads ?? []).find((l) => l.id === pendingMove.leadId)
    : null;

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
              selected={selected}
              onToggleSelect={toggleSelect}
              onShowHistory={setHistoryLeadId}
            />
            {(stages ?? []).map((stage) => (
              <Column
                key={stage.id}
                stage={stage}
                leads={leadsFor(stage.id)}
                qualityName={qualityName}
                selected={selected}
                onToggleSelect={toggleSelect}
                onShowHistory={setHistoryLeadId}
              />
            ))}
          </div>
        </DndContext>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-[8px] px-[10px] py-[8px] border-t border-border bg-muted/40">
          <span className="text-[13px] text-muted-foreground shrink-0">
            {selected.size} {t("seleccionados")}
          </span>
          <select
            className="text-[13px] bg-background border border-border rounded-lg px-[8px] py-[4px] min-w-0"
            value={bulkStageId}
            onChange={(e) => setBulkStageId(e.target.value)}
          >
            <option value="">{t("Sin etapa")}</option>
            {(stages ?? []).map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            className="primary shrink-0"
            loading={bulkSetStage.isPending}
            onClick={handleBulkMove}
          >
            {t("Mover")}
          </Button>
          <button
            type="button"
            className="text-[13px] text-muted-foreground shrink-0"
            onClick={() => {
              setSelected(new Set());
              setBulkError(null);
            }}
          >
            {t("Limpiar")}
          </button>
        </div>
      )}
      {bulkError && (
        <div className="px-[10px] py-[8px] text-[13px] text-destructive border-t border-border">
          {bulkError}
        </div>
      )}

      {pendingMove && pendingLead && (
        <LeadRequiredFieldsModal
          leadId={pendingMove.leadId}
          stageId={pendingMove.stageId}
          missingFieldIds={pendingMove.missingFieldIds}
          currentValues={
            (pendingLead.custom_fields ?? {}) as Record<string, unknown>
          }
          onClose={() => setPendingMove(null)}
          onDone={() => setPendingMove(null)}
        />
      )}

      {historyLeadId && (
        <LeadHistoryModal
          leadId={historyLeadId}
          stageNames={stageNames}
          qualityNames={qualityNames}
          agentNames={agentNames}
          onClose={() => setHistoryLeadId(null)}
        />
      )}
    </>
  );
}
